import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { sha256Hex } from "./crypto";

/** Append a tamper-evident entry: hash = sha256(prevHash | actor | action | entity | time). */
export async function audit(
  ctx: MutationCtx,
  e: {
    tenantId?: Id<"tenants">;
    actorId?: Id<"users">; // omit for system events
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const last = await ctx.db
    .query("audit_log")
    .withIndex("by_tenant_time", (q) => q.eq("tenantId", e.tenantId))
    .order("desc")
    .first();
  const prevHash = last?.hash ?? "genesis";
  const createdAt = Date.now();
  const hash = await sha256Hex(
    [prevHash, e.actorId, e.action, e.entityType, e.entityId, createdAt].join("|"),
  );
  await ctx.db.insert("audit_log", { ...e, prevHash, hash, createdAt });
}
