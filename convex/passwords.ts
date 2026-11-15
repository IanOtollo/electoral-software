import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/guard";
import { audit } from "./lib/audit";
import { hashPassword, sha256Hex, validatePasswordStrength, verifyPassword } from "./lib/crypto";

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });
const minFor = (role: string) => (role === "super_admin" ? 8 : 6);

/** Lets the reset page greet the person without consuming the link. */
export const previewReset = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const hash = await sha256Hex(args.token);
    const r = await ctx.db.query("password_resets").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).unique();
    if (!r || r.usedAt || r.expiresAt < Date.now()) return null;
    const u = await ctx.db.get(r.userId);
    if (!u || u.status !== "active") return null;
    return { email: u.email, name: u.name };
  },
});

/** Public: the one-time link is the credential. Choosing a new password signs the person out everywhere. */
export const resetPassword = mutation({
  args: { token: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const hash = await sha256Hex(args.token);
    const r = await ctx.db.query("password_resets").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).unique();
    if (!r || r.usedAt || r.expiresAt < Date.now()) throw fail("This reset link is invalid or has expired. Ask your administrator for a new one.");
    const u = await ctx.db.get(r.userId);
    if (!u || u.status !== "active") throw fail("This account is not available");
    const weak = validatePasswordStrength(args.password, minFor(u.role));
    if (weak) throw fail(weak);

    await ctx.db.patch(u._id, { passwordHash: await hashPassword(args.password) });
    await ctx.db.patch(r._id, { usedAt: Date.now() });
    for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", u._id)).collect()) {
      if (!s.revokedAt) await ctx.db.patch(s._id, { revokedAt: Date.now() });
    }
    // A wrong-password lockout must not outlive the reset.
    const attempt = await ctx.db.query("login_attempts").withIndex("by_key", (q) => q.eq("key", u.email)).unique();
    if (attempt) await ctx.db.delete(attempt._id);
    await audit(ctx, { tenantId: u.tenantId, actorId: u._id, action: "auth.password_reset", entityType: "users", entityId: u._id });
    return { email: u.email };
  },
});

/** Signed-in people change their own password. Every other session of theirs is ended. */
export const changePassword = mutation({
  args: { current: v.string(), next: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!(await verifyPassword(args.current, user.passwordHash))) throw fail("Your current password is not right");
    if (args.current === args.next) throw fail("Choose a password you have not used just now");
    const weak = validatePasswordStrength(args.next, minFor(user.role));
    if (weak) throw fail(weak);

    await ctx.db.patch(user._id, { passwordHash: await hashPassword(args.next) });
    const keep = (await ctx.auth.getUserIdentity())?.["sid"];
    let ended = 0;
    for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", user._id)).collect()) {
      if (!s.revokedAt && s.sid !== keep) { await ctx.db.patch(s._id, { revokedAt: Date.now() }); ended++; }
    }
    await audit(ctx, { tenantId: user.tenantId, actorId: user._id, action: "auth.password_changed", entityType: "users", entityId: user._id, metadata: { otherSessionsEnded: ended } });
    return { otherSessionsEnded: ended };
  },
});
