import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword, validatePasswordStrength } from "./lib/crypto";
import { audit } from "./lib/audit";

/**
 * One-time CLI bootstrap. Internal functions cannot be called from browsers:
 *   npx convex run bootstrap:createSuperAdmin '{"email":"...","name":"...","password":"..."}'
 */
export const createSuperAdmin = internalMutation({
  args: { email: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    // The platform administrator controls every workspace, so this one account keeps a stricter minimum.
    const weak = validatePasswordStrength(args.password, 12);
    if (weak) throw new Error(weak);
    if (await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).unique()) {
      throw new Error("User already exists");
    }
    const id = await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      role: "super_admin",
      status: "active",
      passwordHash: await hashPassword(args.password),
      createdAt: Date.now(),
    });
    await audit(ctx, { actorId: id, action: "platform.super_admin_created", entityType: "users", entityId: id });
    return id;
  },
});
