import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { authorize } from "./lib/guard";
import { audit } from "./lib/audit";
import { normalizeKenyanPhone } from "./lib/phone";

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });
const MAX_BATCH = 500;

type Delta = { total?: number; optedIn?: number; group?: string | undefined; groupDelta?: number };

/** Keeps the running totals in step with every change, so counts never need a scan. */
async function bump(ctx: MutationCtx, tenantId: Id<"tenants">, d: Delta) {
  const row = await ctx.db.query("contact_stats").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).unique();
  const base = row ?? { tenantId, total: 0, optedIn: 0, groups: [] as { name: string; count: number }[] };
  const groups = base.groups.map((g) => ({ ...g }));
  if (d.group && d.groupDelta) {
    const g = groups.find((x) => x.name === d.group);
    if (g) g.count = Math.max(0, g.count + d.groupDelta);
    else if (d.groupDelta > 0) groups.push({ name: d.group, count: d.groupDelta });
  }
  const next = {
    tenantId,
    total: Math.max(0, base.total + (d.total ?? 0)),
    optedIn: Math.max(0, base.optedIn + (d.optedIn ?? 0)),
    groups: groups.filter((g) => g.count > 0),
  };
  if (row) await ctx.db.replace(row._id, next);
  else await ctx.db.insert("contact_stats", next);
}

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "voters:read");
    if (!tenantId) return { total: 0, optedIn: 0, groups: [] };
    const row = await ctx.db.query("contact_stats").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).unique();
    return { total: row?.total ?? 0, optedIn: row?.optedIn ?? 0, groups: (row?.groups ?? []).sort((a, b) => b.count - a.count) };
  },
});

/** The most recent contacts (a page, never the whole list). */
export const recent = query({
  args: { group: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { tenantId } = await authorize(ctx, "voters:read");
    if (!tenantId) return [];
    const rows = args.group
      ? await ctx.db.query("contacts").withIndex("by_tenant_group", (q) => q.eq("tenantId", tenantId).eq("group", args.group)).order("desc").take(100)
      : await ctx.db.query("contacts").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).order("desc").take(100);
    return rows.map((c) => ({ id: c._id, name: c.name ?? "", phone: c.phone, group: c.group ?? "", status: c.consentStatus, source: c.consentSource, at: c.consentAt }));
  },
});

/**
 * Add contacts. The person adding them must state how consent was obtained and confirm they can prove it:
 * the Communications Authority requires express opt-in and expects evidence on request (clauses 10.1 and 10.4).
 */
export const importBatch = mutation({
  args: {
    rows: v.array(v.object({ name: v.optional(v.string()), phone: v.string(), group: v.optional(v.string()) })),
    consentSource: v.string(),
    confirmConsent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "voters:write");
    if (!tenantId) throw fail("No workspace");
    if (!args.confirmConsent) throw fail("Confirm that every person on this list has opted in and that you can show it");
    const source = args.consentSource.trim();
    if (source.length < 5) throw fail("Say how these people opted in, for example \"signed membership forms, March 2026\"");
    if (args.rows.length === 0) throw fail("There are no contacts to add");
    if (args.rows.length > MAX_BATCH) throw fail(`Add at most ${MAX_BATCH} contacts at a time`);

    let added = 0, duplicates = 0, invalid = 0;
    const seen = new Set<string>();
    const groupAdds = new Map<string, number>();
    const now = Date.now();
    for (const r of args.rows) {
      const phone = normalizeKenyanPhone(r.phone);
      if (!phone) { invalid++; continue; }
      if (seen.has(phone)) { duplicates++; continue; }
      seen.add(phone);
      const exists = await ctx.db.query("contacts").withIndex("by_tenant_phone", (q) => q.eq("tenantId", tenantId).eq("phone", phone)).first();
      if (exists) { duplicates++; continue; }
      const group = r.group?.trim().slice(0, 40) || undefined;
      await ctx.db.insert("contacts", {
        tenantId, name: r.name?.trim().slice(0, 80) || undefined, phone, group,
        consentStatus: "opted_in", consentSource: source, consentAt: now, consentBy: user._id, createdAt: now,
      });
      added++;
      if (group) groupAdds.set(group, (groupAdds.get(group) ?? 0) + 1);
    }
    await bump(ctx, tenantId, { total: added, optedIn: added });
    for (const [group, n] of groupAdds) await bump(ctx, tenantId, { group, groupDelta: n });
    await audit(ctx, { tenantId, actorId: user._id, action: "contacts.imported", entityType: "contacts", entityId: tenantId, metadata: { added, duplicates, invalid, source } });
    return { added, duplicates, invalid };
  },
});

/** Withdraw consent: this contact is never messaged again. */
export const optOut = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "voters:write");
    const c = await ctx.db.get(args.contactId);
    if (!c || c.tenantId !== tenantId || !tenantId) throw fail("Contact not found");
    if (c.consentStatus === "opted_out") return;
    await ctx.db.patch(c._id, { consentStatus: "opted_out", consentAt: Date.now(), consentBy: user._id });
    await bump(ctx, tenantId, { optedIn: -1, group: c.group, groupDelta: -1 });
    await audit(ctx, { tenantId, actorId: user._id, action: "contacts.opted_out", entityType: "contacts", entityId: c._id });
  },
});

export const remove = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "voters:write");
    const c = await ctx.db.get(args.contactId);
    if (!c || c.tenantId !== tenantId || !tenantId) throw fail("Contact not found");
    await ctx.db.delete(c._id);
    const was = c.consentStatus === "opted_in";
    await bump(ctx, tenantId, { total: -1, optedIn: was ? -1 : 0, group: was ? c.group : undefined, groupDelta: was ? -1 : 0 });
    await audit(ctx, { tenantId, actorId: user._id, action: "contacts.removed", entityType: "contacts", entityId: c._id });
  },
});
