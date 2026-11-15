import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { authorize, AuthError, assertSameTenant } from "./lib/guard";
import { audit } from "./lib/audit";
import { hashPassword, randomToken, sha256Hex, validatePasswordStrength } from "./lib/crypto";
import { canAssign, ROLE_RANK } from "./lib/permissions";

const INVITE_TTL = 1000 * 60 * 60 * 72;

export const roleArg = v.union(
  v.literal("super_admin"),
  v.literal("tenant_admin"),
  v.literal("campaign_manager"),
  v.literal("comms_officer"),
  v.literal("tally_clerk"),
  v.literal("field_agent"),
  v.literal("viewer"),
);

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "users:read");
    if (!tenantId) return [];
    const users = await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    return users
      .map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
      }))
      .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.name.localeCompare(b.name));
  },
});

export const listInvites = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "users:manage");
    if (!tenantId) return [];
    const now = Date.now();
    const rows = await ctx.db.query("invites").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    return rows
      .filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt > now)
      .map((i) => ({ id: i._id, email: i.email, role: i.role, expiresAt: i.expiresAt }));
  },
});

/** Returns the one-time invite token. Only its hash is stored, so it can never be shown again. */
export const invite = mutation({
  args: { email: v.string(), role: roleArg },
  handler: async (ctx, args) => {
    const actor = await authorize(ctx, "users:manage");
    if (!actor.tenantId) throw fail("Select a workspace first");
    if (!canAssign(actor.user.role, args.role)) throw new AuthError("FORBIDDEN", "You cannot grant that role");

    const email = args.email.toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw fail("Enter a valid email address");
    if (await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).unique()) {
      throw fail("A user with this email already exists");
    }

    const token = randomToken(32);
    const id = await ctx.db.insert("invites", {
      tenantId: actor.tenantId,
      email,
      role: args.role,
      tokenHash: await sha256Hex(token),
      invitedBy: actor.user._id,
      expiresAt: Date.now() + INVITE_TTL,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      tenantId: actor.tenantId,
      actorId: actor.user._id,
      action: "user.invited",
      entityType: "invites",
      entityId: id,
      metadata: { email, role: args.role },
    });
    return { token };
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const actor = await authorize(ctx, "users:manage");
    const inv = await ctx.db.get(args.inviteId);
    if (!inv) return;
    assertSameTenant(actor, inv.tenantId);
    await ctx.db.patch(inv._id, { revokedAt: Date.now() });
    await audit(ctx, {
      tenantId: inv.tenantId,
      actorId: actor.user._id,
      action: "user.invite_revoked",
      entityType: "invites",
      entityId: inv._id,
    });
  },
});

/** Public: the invite token is the credential. Creates the account and consumes the invite. */
export const acceptInvite = mutation({
  args: { token: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const hash = await sha256Hex(args.token);
    const invite = await ctx.db.query("invites").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).unique();
    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < Date.now()) {
      throw fail("This invitation is invalid or has expired");
    }
    const weak = validatePasswordStrength(args.password);
    if (weak) throw fail(weak);
    const name = args.name.trim();
    if (name.length < 2) throw fail("Enter your full name");
    if (await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", invite.email)).unique()) {
      throw fail("An account with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      tenantId: invite.tenantId,
      email: invite.email,
      name,
      role: invite.role,
      status: "active",
      passwordHash: await hashPassword(args.password),
      createdAt: Date.now(),
    });
    await ctx.db.patch(invite._id, { acceptedAt: Date.now() });
    await audit(ctx, {
      tenantId: invite.tenantId,
      actorId: userId,
      action: "user.joined",
      entityType: "users",
      entityId: userId,
      metadata: { role: invite.role },
    });
    return { email: invite.email };
  },
});

/** Preview an invite (workspace + role) without consuming it, so the join page can greet the user. */
export const previewInvite = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const hash = await sha256Hex(args.token);
    const invite = await ctx.db.query("invites").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).unique();
    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < Date.now()) return null;
    const tenant = invite.tenantId ? await ctx.db.get(invite.tenantId) : null;
    return { email: invite.email, role: invite.role, workspace: tenant?.name ?? "Platform" };
  },
});

async function activeAdminCount(ctx: MutationCtx, tenantId: Id<"tenants">) {
  const all = await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
  return all.filter((u) => u.role === "tenant_admin" && u.status === "active").length;
}

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleArg },
  handler: async (ctx, args) => {
    const actor = await authorize(ctx, "users:manage");
    const target = await ctx.db.get(args.userId);
    if (!target) throw fail("User not found");
    assertSameTenant(actor, target.tenantId);
    if (target._id === actor.user._id) throw fail("You cannot change your own role");
    if (!canAssign(actor.user.role, args.role)) throw new AuthError("FORBIDDEN", "You cannot grant that role");
    if (!canAssign(actor.user.role, target.role)) throw new AuthError("FORBIDDEN", "You cannot modify this user");
    if (
      target.role === "tenant_admin" &&
      args.role !== "tenant_admin" &&
      target.tenantId &&
      (await activeAdminCount(ctx, target.tenantId)) <= 1
    ) {
      throw fail("A workspace must keep at least one administrator");
    }
    await ctx.db.patch(target._id, { role: args.role });
    await audit(ctx, {
      tenantId: target.tenantId,
      actorId: actor.user._id,
      action: "user.role_changed",
      entityType: "users",
      entityId: target._id,
      metadata: { from: target.role, to: args.role },
    });
  },
});

export const setStatus = mutation({
  args: { userId: v.id("users"), status: v.union(v.literal("active"), v.literal("suspended")) },
  handler: async (ctx, args) => {
    const actor = await authorize(ctx, "users:manage");
    const target = await ctx.db.get(args.userId);
    if (!target) throw fail("User not found");
    assertSameTenant(actor, target.tenantId);
    if (target._id === actor.user._id) throw fail("You cannot suspend yourself");
    if (!canAssign(actor.user.role, target.role)) throw new AuthError("FORBIDDEN", "You cannot modify this user");
    if (
      args.status === "suspended" &&
      target.role === "tenant_admin" &&
      target.tenantId &&
      (await activeAdminCount(ctx, target.tenantId)) <= 1
    ) {
      throw fail("A workspace must keep at least one administrator");
    }
    await ctx.db.patch(target._id, { status: args.status });
    if (args.status === "suspended") {
      const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", target._id)).collect();
      for (const s of sessions) if (!s.revokedAt) await ctx.db.patch(s._id, { revokedAt: Date.now() });
    }
    await audit(ctx, {
      tenantId: target.tenantId,
      actorId: actor.user._id,
      action: args.status === "active" ? "user.reactivated" : "user.suspended",
      entityType: "users",
      entityId: target._id,
    });
  },
});
