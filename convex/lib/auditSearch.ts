import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type AuditFilter = {
  tenantId?: Id<"tenants"> | null; // null = the platform's own entries; undefined = every workspace
  group?: string; // action prefix, e.g. "auth."
  actorId?: Id<"users">;
  text?: string;
  from?: number;
  to?: number;
  before?: number; // paging: only entries older than this
  limit?: number;
};

const SCAN = 700;

/**
 * Newest-first search over the audit log. It reads at most SCAN entries per call and hands back a
 * cursor ("next") when there may be more, so any size of log can be paged without a long query.
 */
export async function searchAudit(ctx: QueryCtx, f: AuditFilter & { scope: "all" | Id<"tenants"> }) {
  const limit = Math.min(f.limit ?? 50, 100);
  const upper = Math.min(f.before ?? Number.MAX_SAFE_INTEGER - 1, f.to !== undefined ? f.to + 1 : Number.MAX_SAFE_INTEGER - 1);
  const lower = f.from ?? 0;
  const scope = f.scope;
  const q =
    scope === "all"
      ? ctx.db.query("audit_log").withIndex("by_time", (x) => x.gte("createdAt", lower).lt("createdAt", upper))
      : ctx.db.query("audit_log").withIndex("by_tenant_time", (x) => x.eq("tenantId", scope).gte("createdAt", lower).lt("createdAt", upper));
  const scanned = await q.order("desc").take(SCAN);

  const text = f.text?.trim().toLowerCase();
  const userCache = new Map<string, Doc<"users"> | null>();
  const tenantCache = new Map<string, string>();
  const user = async (id?: Id<"users">) => {
    if (!id) return null;
    if (!userCache.has(id)) userCache.set(id, await ctx.db.get(id));
    return userCache.get(id) ?? null;
  };
  const tenant = async (id?: Id<"tenants">) => {
    if (!id) return null;
    if (!tenantCache.has(id)) tenantCache.set(id, (await ctx.db.get(id))?.name ?? "Deleted workspace");
    return { id, name: tenantCache.get(id)! };
  };

  const rows = [];
  let lastScanned: number | null = null;
  let stoppedEarly = false;
  for (const r of scanned) {
    lastScanned = r.createdAt;
    if (f.tenantId === null && r.tenantId) continue;
    if (f.tenantId && scope === "all" && r.tenantId !== f.tenantId) continue;
    if (f.group && !r.action.startsWith(f.group)) continue;
    if (f.actorId && r.actorId !== f.actorId) continue;
    const actor = await user(r.actorId);
    if (text) {
      const hay = [r.action, r.entityType, r.entityId, actor?.name ?? "system", actor?.email ?? "", JSON.stringify(r.metadata ?? {})].join(" ").toLowerCase();
      if (!hay.includes(text)) continue;
    }
    if (rows.length >= limit) {
      stoppedEarly = true;
      break;
    }
    rows.push({
      id: r._id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata ?? null,
      hash: r.hash,
      prevHash: r.prevHash,
      createdAt: r.createdAt,
      actor: actor ? { id: actor._id, name: actor.name, email: actor.email, role: actor.role } : null,
      workspace: await tenant(r.tenantId),
    });
  }
  // More to read if we filled the page, or the scan itself hit its cap.
  const more = stoppedEarly || scanned.length >= SCAN;
  const next = more ? (stoppedEarly && rows.length ? rows[rows.length - 1].createdAt : lastScanned) : null;
  return { rows, next, capped: scanned.length >= SCAN && !stoppedEarly };
}
