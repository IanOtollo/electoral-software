import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { hasPermission, type Permission, type Role } from "./permissions";

type Ctx = QueryCtx | MutationCtx;

export type Actor = {
  user: Doc<"users"> & { role: Role };
  /** The tenant this request is scoped to. Undefined only for platform-level calls. */
  tenantId: Id<"tenants"> | undefined;
};

export class AuthError extends ConvexError<{ code: string; message: string }> {
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN" | "SUSPENDED", message: string) {
    super({ code, message });
  }
}

/** Resolve the signed-in user. Re-reads the DB every call so role changes and revocation apply instantly. */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new AuthError("UNAUTHENTICATED", "Please sign in");

  const sid = identity["sid"];
  const session =
    typeof sid === "string"
      ? await ctx.db.query("sessions").withIndex("by_sid", (q) => q.eq("sid", sid)).unique()
      : null;
  if (!session || session.revokedAt || session.expiresAt < Date.now()) {
    throw new AuthError("UNAUTHENTICATED", "Session expired");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || user.status !== "active") throw new AuthError("SUSPENDED", "Account is disabled");

  if (user.tenantId) {
    const tenant = await ctx.db.get(user.tenantId);
    if (!tenant || tenant.status === "suspended") {
      throw new AuthError("SUSPENDED", "This workspace is suspended");
    }
  }
  return user;
}

/**
 * The one entry point for authorization. Every query/mutation touching tenant
 * data must call this with the permission it needs; the returned `tenantId`
 * is the ONLY tenant id that may be used to read or write.
 *
 * Super admins must name the tenant explicitly (`forTenant`) and only receive
 * platform permissions, so they cannot read voter or SMS content.
 */
export async function authorize(
  ctx: Ctx,
  permission: Permission,
  opts: { forTenant?: Id<"tenants"> } = {},
): Promise<Actor> {
  const user = await requireUser(ctx);
  if (!hasPermission(user.role, permission)) {
    throw new AuthError("FORBIDDEN", "You do not have permission to do that");
  }
  if (user.role === "super_admin") {
    return { user, tenantId: opts.forTenant };
  }
  if (!user.tenantId) throw new AuthError("FORBIDDEN", "User has no workspace");
  if (opts.forTenant && opts.forTenant !== user.tenantId) {
    throw new AuthError("FORBIDDEN", "Cross-workspace access denied");
  }
  return { user, tenantId: user.tenantId };
}

/** Throws unless the target belongs to the actor's tenant (or actor is platform admin). */
export function assertSameTenant(actor: Actor, targetTenantId: Id<"tenants"> | undefined) {
  if (actor.user.role === "super_admin") return;
  if (actor.tenantId !== targetTenantId) throw new AuthError("FORBIDDEN", "Cross-workspace access denied");
}
