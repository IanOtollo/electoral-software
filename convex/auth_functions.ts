import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import bcrypt from "bcryptjs";
import { requireSession, writeAuditLog } from "./utils";

export const loginWithEmail = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();

    if (!user || !user.passwordHash) {
      throw new ConvexError("Invalid email or password");
    }

    const valid = await bcrypt.compare(args.password, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Invalid email or password");
    }

    if (user.totpEnabled) {
      throw new ConvexError("TOTP verification required — contact your administrator");
    }

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

    await ctx.db.insert("auth_sessions", { userId: user._id, token, expiresAt });
    await ctx.db.patch(user._id, { lastLoginAt: Date.now() });

    await writeAuditLog(ctx, {
      actorId: user._id,
      tenantId: user.tenantId,
      action: "auth.login",
      entityType: "users",
      entityId: user._id,
    });

    let tenant = null;
    if (user.tenantId) {
      tenant = await ctx.db.get(user.tenantId);
    }

    return {
      token,
      user: {
        id: user._id,
        role: user.role,
        tenantId: user.tenantId,
        email: user.email,
        name: user.email?.split("@")[0] ?? "User",
      },
      tenant: tenant
        ? {
            id: tenant._id,
            name: tenant.name,
            licensedModules: tenant.licensedModules,
            planTier: tenant.planTier,
            billingStatus: tenant.billingStatus,
          }
        : null,
    };
  },
});

export const getSessionUser = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    try {
      const user = await requireSession(ctx, args.token);
      let tenant = null;
      if (user.tenantId) {
        const t = await ctx.db.get(user.tenantId);
        if (t) {
          tenant = {
            id: t._id,
            name: t.name,
            licensedModules: t.licensedModules,
            planTier: t.planTier,
            billingStatus: t.billingStatus,
            senderId: t.senderId,
          };
        }
      }
      return {
        id: user._id,
        role: user.role,
        tenantId: user.tenantId,
        email: user.email,
        name: user.email?.split("@")[0] ?? "User",
        tenant,
      };
    } catch {
      return null;
    }
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("auth_sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      const user = await ctx.db.get(session.userId);
      await ctx.db.delete(session._id);
      if (user) {
        await writeAuditLog(ctx, {
          actorId: user._id,
          tenantId: user.tenantId,
          action: "auth.logout",
          entityType: "users",
          entityId: user._id,
        });
      }
    }
  },
});
