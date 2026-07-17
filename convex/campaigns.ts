import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_token", (q) => q.eq("agentInviteLink", args.token))
      .first();
  },
});

export const getAdminCampaign = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("campaigns").first();
  },
});

export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("campaigns").collect();
    for (const doc of all) {
      await ctx.db.delete(doc._id);
    }
  }
});

export const seedCampaign = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("campaigns").first();
    if (existing) return existing._id;
    
    return await ctx.db.insert("campaigns", {
      candidates: [], // Start with an empty list instead of John Doe
      office: "President", // Default to a blank or neutral slate
      country: "Kenya",
      county: "",
      agentInviteLink: "nairobi-decides-2027", 
    });
  },
});

export const configureCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    candidates: v.array(v.string()),
    office: v.string(),
    country: v.string(),
    county: v.optional(v.string()),
    constituency: v.optional(v.string()),
    ward: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.campaignId, {
      candidates: args.candidates,
      office: args.office,
      country: args.country,
      county: args.county,
      constituency: args.constituency,
      ward: args.ward,
      isConfigured: true,
    });
  },
});

// Agent Management
export const createAgent = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    phone: v.string(),
    designation: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a secure unique token for this specific agent
    const uniqueToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    // Generate a 4 digit PIN
    const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    return await ctx.db.insert("agents", {
      campaignId: args.campaignId,
      name: args.name,
      phone: args.phone,
      designation: args.designation,
      uniqueToken,
      pinCode,
    });
  },
});

export const deleteAgent = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.agentId);
  },
});

export const updateAgentPin = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    await ctx.db.patch(args.agentId, { pinCode: newPin });
    return newPin;
  },
});

export const bindDevice = mutation({
  args: { 
    agentId: v.id("agents"),
    deviceId: v.string() 
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    if (agent.boundDeviceId && agent.boundDeviceId !== args.deviceId) {
      throw new Error("Device mismatch");
    }

    if (!agent.boundDeviceId) {
      await ctx.db.patch(args.agentId, { boundDeviceId: args.deviceId });
    }
  },
});

export const resetDeviceBinding = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, { boundDeviceId: undefined });
  },
});

export const getAgentByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_token", (q) => q.eq("uniqueToken", args.token))
      .first();
  },
});

export const getCampaignAgents = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    if (!args.campaignId) return [];
    return await ctx.db
      .query("agents")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .collect();
  },
});
