import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { authorize } from "./lib/guard";
import { audit } from "./lib/audit";
import { randomToken, sha256Hex } from "./lib/crypto";
import { isReservedHandle } from "./lib/reserved";

const INVITE_TTL = 1000 * 60 * 60 * 72;
const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });

const moduleArg = v.union(v.literal("sms"), v.literal("tally"));
const planArg = v.union(
  v.literal("starter"),
  v.literal("constituency"),
  v.literal("county"),
  v.literal("national"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "tenants:manage");
    const tenants = await ctx.db.query("tenants").order("desc").collect();
    return await Promise.all(
      tenants.map(async (t) => {
        const users = await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).collect();
        return { ...t, userCount: users.filter((u) => u.status === "active").length };
      }),
    );
  },
});

/** Creates the workspace and returns a one-time invite for its first administrator. */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    plan: planArg,
    modules: v.array(moduleArg),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    adminEmail: v.string(),
    senderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const slug = args.slug.toLowerCase().trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw fail("Slug may only contain lower-case letters, numbers and hyphens");
    if (isReservedHandle(slug)) throw fail("That address is reserved. Choose another workspace slug.");
    if (await ctx.db.query("tenants").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) {
      throw fail("That workspace slug is already in use");
    }
    const adminEmail = args.adminEmail.toLowerCase().trim();
    if (await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", adminEmail)).unique()) {
      throw fail("A user with that email already exists");
    }
    if (args.senderId && !/^[A-Za-z0-9]{3,11}$/.test(args.senderId)) {
      throw fail("Sender ID must be 3 to 11 letters or numbers");
    }

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name.trim(),
      slug,
      status: "trial",
      plan: args.plan,
      modules: args.modules,
      contactEmail: args.contactEmail.trim(),
      contactPhone: args.contactPhone?.trim(),
      senderId: args.senderId,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    const token = randomToken(32);
    await ctx.db.insert("invites", {
      tenantId,
      email: adminEmail,
      role: "tenant_admin",
      tokenHash: await sha256Hex(token),
      invitedBy: user._id,
      expiresAt: Date.now() + INVITE_TTL,
      createdAt: Date.now(),
    });

    await audit(ctx, {
      tenantId,
      actorId: user._id,
      action: "tenant.created",
      entityType: "tenants",
      entityId: tenantId,
      metadata: { name: args.name, adminEmail },
    });
    return { tenantId, inviteToken: token };
  },
});

export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.union(v.literal("trial"), v.literal("active"), v.literal("suspended"))),
    plan: v.optional(planArg),
    modules: v.optional(v.array(moduleArg)),
    senderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw fail("Workspace not found");
    const { tenantId, ...changes } = args;
    const patch = Object.fromEntries(Object.entries(changes).filter(([, val]) => val !== undefined));
    await ctx.db.patch(tenantId, patch);
    await audit(ctx, {
      tenantId,
      actorId: user._id,
      action: "tenant.updated",
      entityType: "tenants",
      entityId: tenantId,
      metadata: patch,
    });
  },
});
