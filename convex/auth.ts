import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertServer, randomToken, verifyPassword } from "./lib/crypto";
import { requireUser } from "./lib/guard";
import { audit } from "./lib/audit";
import { ROLE_PERMISSIONS } from "./lib/permissions";

const SESSION_TTL = 1000 * 60 * 60 * 12; // 12h: an election day plus margin
const MAX_FAILURES = 5;
const LOCK_MS = 1000 * 60 * 15;
const WINDOW_MS = 1000 * 60 * 15;

// Unknown emails cost the same as wrong passwords, so timing can't enumerate users.
const DUMMY_HASH = "pbkdf2$210000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

/**
 * Server-only (gated by SERVER_SECRET). Returns a result instead of throwing on
 * bad credentials: a thrown error rolls the transaction back, which would
 * discard the failed-attempt counter and defeat the lockout.
 */
export const login = mutation({
  args: {
    serverSecret: v.string(),
    email: v.string(),
    password: v.string(),
    userAgent: v.optional(v.string()),
    // Which sign-in form was used. Platform admins may only use "admin"; everyone else only "campaign".
    scope: v.union(v.literal("campaign"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    assertServer(args.serverSecret);
    const key = args.email.toLowerCase().trim();
    const now = Date.now();

    const attempt = await ctx.db
      .query("login_attempts")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (attempt?.lockedUntil && attempt.lockedUntil > now) {
      return { ok: false as const, reason: "locked" as const, retryAfterMs: attempt.lockedUntil - now };
    }

    const user = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", key)).unique();
    const valid = await verifyPassword(args.password, user?.passwordHash ?? DUMMY_HASH);

    const scopeOk = !!user && (user.role === "super_admin") === (args.scope === "admin");
    if (!user || !valid || user.status !== "active" || !scopeOk) {
      const fresh = !attempt || now - attempt.windowStart > WINDOW_MS;
      const failures = fresh ? 1 : attempt.failures + 1;
      const patch = {
        failures,
        windowStart: fresh ? now : attempt.windowStart,
        lockedUntil: failures >= MAX_FAILURES ? now + LOCK_MS : undefined,
      };
      if (attempt) await ctx.db.patch(attempt._id, patch);
      else await ctx.db.insert("login_attempts", { key, ...patch });
      return { ok: false as const, reason: "invalid" as const };
    }

    if (attempt) await ctx.db.delete(attempt._id);

    const sid = randomToken(24);
    const expiresAt = now + SESSION_TTL;
    await ctx.db.insert("sessions", { sid, userId: user._id, expiresAt, userAgent: args.userAgent, createdAt: now });
    await ctx.db.patch(user._id, { lastLoginAt: now });
    await audit(ctx, {
      tenantId: user.tenantId,
      actorId: user._id,
      action: "auth.login",
      entityType: "users",
      entityId: user._id,
    });

    return { ok: true as const, sid, userId: user._id, role: user.role, expiresAt };
  },
});

/** Server-only: is this session still valid? Checked before minting each short-lived Convex JWT. */
export const sessionStatus = query({
  args: { serverSecret: v.string(), sid: v.string() },
  handler: async (ctx, args) => {
    assertServer(args.serverSecret);
    const s = await ctx.db.query("sessions").withIndex("by_sid", (q) => q.eq("sid", args.sid)).unique();
    if (!s || s.revokedAt || s.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(s.userId);
    if (!user || user.status !== "active") return null;
    return { userId: user._id, role: user.role };
  },
});

export const logout = mutation({
  args: { serverSecret: v.string(), sid: v.string() },
  handler: async (ctx, args) => {
    assertServer(args.serverSecret);
    const s = await ctx.db.query("sessions").withIndex("by_sid", (q) => q.eq("sid", args.sid)).unique();
    if (!s || s.revokedAt) return;
    await ctx.db.patch(s._id, { revokedAt: Date.now() });
    const user = await ctx.db.get(s.userId);
    if (user) {
      await audit(ctx, {
        tenantId: user.tenantId,
        actorId: user._id,
        action: "auth.logout",
        entityType: "users",
        entityId: user._id,
      });
    }
  },
});

/** The signed-in user, their workspace and effective permissions. Null when signed out. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    let user;
    try {
      user = await requireUser(ctx);
    } catch {
      return null;
    }
    const tenant = user.tenantId ? await ctx.db.get(user.tenantId) : null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role],
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            modules: tenant.modules,
            plan: tenant.plan,
            senderId: tenant.senderId,
          }
        : null,
    };
  },
});
