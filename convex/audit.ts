import { query } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./lib/guard";
import { sha256Hex } from "./lib/crypto";

/** Workspace admins see their workspace; platform admins pass `tenantId` or see platform events. */
export const list = query({
  args: { tenantId: v.optional(v.id("tenants")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { tenantId } = await authorize(ctx, "audit:read", { forTenant: args.tenantId });
    const rows = await ctx.db
      .query("audit_log")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(Math.min(args.limit ?? 100, 500));

    const names = new Map<string, string>();
    for (const r of rows) {
      if (r.actorId && !names.has(r.actorId)) names.set(r.actorId, (await ctx.db.get(r.actorId))?.name ?? "Unknown");
    }
    return rows.map((r) => ({
      id: r._id,
      action: r.action,
      actor: r.actorId ? (names.get(r.actorId) ?? "Unknown") : "System",
      entityType: r.entityType,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
  },
});

/** Recomputes the hash chain to prove no entry was altered or removed. */
export const verifyChain = query({
  args: { tenantId: v.optional(v.id("tenants")) },
  handler: async (ctx, args) => {
    const { tenantId } = await authorize(ctx, "audit:read", { forTenant: args.tenantId });
    const rows = await ctx.db
      .query("audit_log")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .order("asc")
      .collect();
    let prev = "genesis";
    for (const r of rows) {
      const expected = await sha256Hex([prev, r.actorId, r.action, r.entityType, r.entityId, r.createdAt].join("|"));
      if (r.prevHash !== prev || r.hash !== expected) return { valid: false, entries: rows.length, brokenAt: r._id };
      prev = r.hash;
    }
    return { valid: true, entries: rows.length, brokenAt: null };
  },
});
