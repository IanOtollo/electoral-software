import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { authorize } from "./lib/guard";
import { audit } from "./lib/audit";

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });

/** Which part of the IEBC geography each office contests. */
const LEVEL = {
  president: "national",
  governor: "county",
  senator: "county",
  woman_rep: "county",
  mp: "constituency",
  mca: "ward",
} as const;

const officeArg = v.union(
  v.literal("president"),
  v.literal("governor"),
  v.literal("senator"),
  v.literal("woman_rep"),
  v.literal("mp"),
  v.literal("mca"),
);

export const get = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "tally:read");
    if (!tenantId) return null;
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) return null;
    const candidates = await ctx.db.query("candidates").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    return {
      name: tenant.name,
      office: tenant.office ?? null,
      areaCode: tenant.areaCode ?? null,
      party: tenant.party ?? "",
      smsCredits: tenant.smsCredits ?? 0,
      candidates: candidates
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c._id, name: c.name, party: c.party ?? "", isOurs: c.isOurs })),
    };
  },
});

export const save = mutation({
  args: {
    office: officeArg,
    areaCode: v.string(),
    party: v.optional(v.string()),
    candidates: v.array(
      v.object({ id: v.optional(v.id("candidates")), name: v.string(), party: v.optional(v.string()), isOurs: v.boolean() }),
    ),
  },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "settings:manage");
    if (!tenantId) throw fail("No workspace");

    // The contested area must match the office and exist in the IEBC data.
    const level = LEVEL[args.office];
    const want = { national: 0, county: 3, constituency: 6, ward: 10 }[level];
    if (args.areaCode.length !== want || (want > 0 && !/^\d+$/.test(args.areaCode))) {
      throw fail(level === "national" ? "The presidency is contested nationally" : `Choose the ${level} you are contesting`);
    }
    if (level === "county") {
      const hit = await ctx.db.query("stations").withIndex("by_county", (q) => q.eq("county", args.areaCode)).first();
      if (!hit) throw fail("That county was not found in the IEBC register");
    } else if (level === "constituency") {
      const hit = await ctx.db.query("stations").withIndex("by_constituency", (q) => q.eq("constituency", args.areaCode)).first();
      if (!hit) throw fail("That constituency was not found in the IEBC register");
    } else if (level === "ward") {
      const hit = await ctx.db.query("stations").withIndex("by_ward", (q) => q.eq("ward", args.areaCode)).first();
      if (!hit) throw fail("That ward was not found in the IEBC register");
    }

    const names = args.candidates.map((c) => c.name.trim());
    if (names.length < 2) throw fail("Add at least two candidates: yourself and one opponent");
    if (names.length > 25) throw fail("A race can have at most 25 candidates");
    if (names.some((n) => n.length < 2)) throw fail("Every candidate needs a name");
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw fail("Candidate names must all be different");
    if (args.candidates.filter((c) => c.isOurs).length !== 1) throw fail("Mark exactly one candidate as yourself");

    const existing = await ctx.db.query("candidates").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    const keep = new Set(args.candidates.flatMap((c) => (c.id ? [c.id] : [])));
    const removed = existing.filter((c) => !keep.has(c._id));
    if (removed.length) {
      const anySubmission = await ctx.db.query("submissions").withIndex("by_tenant_current", (q) => q.eq("tenantId", tenantId)).first();
      if (anySubmission) throw fail("Results have already been submitted, so candidates can no longer be removed. You can still rename them.");
      for (const c of removed) await ctx.db.delete(c._id);
    }
    for (const [i, c] of args.candidates.entries()) {
      const doc = { name: c.name.trim(), party: c.party?.trim() || undefined, isOurs: c.isOurs, order: i };
      if (c.id && existing.some((e) => e._id === c.id)) await ctx.db.patch(c.id, doc);
      else await ctx.db.insert("candidates", { tenantId, ...doc });
    }
    await ctx.db.patch(tenantId, { office: args.office, areaCode: args.areaCode, party: args.party?.trim() || undefined });
    await audit(ctx, {
      tenantId,
      actorId: user._id,
      action: "campaign.saved",
      entityType: "tenants",
      entityId: tenantId,
      metadata: { office: args.office, areaCode: args.areaCode },
    });
  },
});
