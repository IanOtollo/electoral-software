import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin, requireTenantAccess, writeAuditLog } from "./utils";

export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx, args.token);
    const tenants = await ctx.db.query("tenants").order("desc").collect();
    return tenants;
  },
});

export const get = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.db.get(args.tenantId);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    slug: v.string(),
    licensedModules: v.array(v.union(v.literal("sms"), v.literal("tally"))),
    planTier: v.union(
      v.literal("starter"),
      v.literal("constituency"),
      v.literal("county"),
      v.literal("enterprise")
    ),
    contactEmail: v.string(),
    contactPhone: v.string(),
    ownerEmail: v.string(),
    ownerPassword: v.string(),
    senderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requirePlatformAdmin(ctx, args.token);
    const now = Date.now();

    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Slug already in use");

    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      licensedModules: args.licensedModules,
      billingStatus: "trial",
      planTier: args.planTier,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      senderId: args.senderId,
      senderIdStatus: args.senderId ? "pending" : undefined,
      createdBy: admin._id,
      createdAt: now,
    });

    await ctx.db.insert("users", {
      tenantId,
      role: "tenant_owner",
      email: args.ownerEmail.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(args.ownerPassword, 12),
      totpEnabled: false,
      status: "active",
      createdAt: now,
    });

    await writeAuditLog(ctx, {
      actorId: admin._id,
      action: "tenant.created",
      entityType: "tenants",
      entityId: tenantId,
      metadata: { name: args.name, ownerEmail: args.ownerEmail },
    });

    return tenantId;
  },
});

export const updateStatus = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    billingStatus: v.union(
      v.literal("trial"),
      v.literal("active"),
      v.literal("suspended"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requirePlatformAdmin(ctx, args.token);
    await ctx.db.patch(args.tenantId, { billingStatus: args.billingStatus });
    await writeAuditLog(ctx, {
      actorId: admin._id,
      tenantId: args.tenantId,
      action: "tenant.status_updated",
      entityType: "tenants",
      entityId: args.tenantId,
      metadata: { billingStatus: args.billingStatus },
    });
  },
});

export const updateModules = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    licensedModules: v.array(v.union(v.literal("sms"), v.literal("tally"))),
    planTier: v.union(
      v.literal("starter"),
      v.literal("constituency"),
      v.literal("county"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requirePlatformAdmin(ctx, args.token);
    await ctx.db.patch(args.tenantId, {
      licensedModules: args.licensedModules,
      planTier: args.planTier,
    });
    await writeAuditLog(ctx, {
      actorId: admin._id,
      tenantId: args.tenantId,
      action: "tenant.modules_updated",
      entityType: "tenants",
      entityId: args.tenantId,
      metadata: { licensedModules: args.licensedModules },
    });
  },
});

export const approveSenderId = mutation({
  args: { token: v.string(), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const admin = await requirePlatformAdmin(ctx, args.token);
    await ctx.db.patch(args.tenantId, { senderIdStatus: "approved" });
    await writeAuditLog(ctx, {
      actorId: admin._id,
      tenantId: args.tenantId,
      action: "tenant.sender_id_approved",
      entityType: "tenants",
      entityId: args.tenantId,
    });
  },
});
