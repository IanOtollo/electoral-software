import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getContacts = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    if (!args.campaignId) return [];
    return await ctx.db
      .query("contacts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId as any))
      .collect();
  },
});

export const addContacts = mutation({
  args: {
    campaignId: v.id("campaigns"),
    contacts: v.array(v.object({
      name: v.optional(v.string()),
      phone: v.string(),
      group: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const existingContacts = await ctx.db
      .query("contacts")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    
    const existingPhones = new Set(existingContacts.map(c => c.phone));

    let addedCount = 0;
    for (const contact of args.contacts) {
      // Basic normalization: remove non-digits
      let normalizedPhone = contact.phone.replace(/\D/g, '');
      
      // Attempt to ensure standard Kenyan format (254...) if it starts with 0
      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "254" + normalizedPhone.slice(1);
      } else if (normalizedPhone.startsWith("254") === false && normalizedPhone.length === 9) {
        normalizedPhone = "254" + normalizedPhone; // Assume 9 digits is missing 254 or 0
      }

      if (normalizedPhone.length < 10) continue; // Skip invalid looking numbers

      if (!existingPhones.has(normalizedPhone)) {
        await ctx.db.insert("contacts", {
          campaignId: args.campaignId,
          name: contact.name || "Unknown",
          phone: normalizedPhone,
          group: contact.group
        });
        existingPhones.add(normalizedPhone);
        addedCount++;
      }
    }
    
    return addedCount;
  },
});

export const getSmsCampaigns = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    if (!args.campaignId) return [];
    return await ctx.db
      .query("smsCampaigns")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId as any))
      .order("desc")
      .collect();
  },
});

export const getSmsLogs = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    if (!args.campaignId) return [];
    return await ctx.db
      .query("smsLogs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId as any))
      .order("desc")
      .collect();
  },
});

export const sendSmsCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    message: v.string(),
    targetGroup: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Create the campaign record
    const smsCampaignId = await ctx.db.insert("smsCampaigns", {
      campaignId: args.campaignId,
      message: args.message,
      targetGroup: args.targetGroup,
      status: "sent",
      sentAt: Date.now(),
    });

    // 2. Fetch target contacts
    let contacts = [];
    if (args.targetGroup === "All Contacts") {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .collect();
    } else {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
        .filter((q) => q.eq(q.field("group"), args.targetGroup))
        .collect();
    }

    // 3. Create simulated logs (in real production, this loops API calls)
    for (const contact of contacts) {
      await ctx.db.insert("smsLogs", {
        campaignId: args.campaignId,
        smsCampaignId: smsCampaignId,
        contactId: contact._id,
        phone: contact.phone,
        message: args.message,
        // Mocking 95% delivery rate, 5% failure
        status: Math.random() > 0.05 ? "Delivered" : "Failed",
        sentAt: Date.now(),
      });
    }

    return { success: true, count: contacts.length };
  },
});
