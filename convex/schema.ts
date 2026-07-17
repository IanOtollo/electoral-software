import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  campaigns: defineTable({
    candidates: v.array(v.string()),
    office: v.string(), // e.g., "President", "Governor", "MP", "MCA"
    country: v.optional(v.string()),
    county: v.optional(v.string()),
    constituency: v.optional(v.string()),
    ward: v.optional(v.string()),
    isConfigured: v.optional(v.boolean()),
    agentInviteLink: v.string(), // Unique token for the puppy portal
  }).index("by_token", ["agentInviteLink"]),

  submissions: defineTable({
    campaignId: v.id("campaigns"),
    agentId: v.optional(v.string()),
    agentName: v.string(),
    agentPhone: v.string(),
    stationName: v.string(),
    stationCode: v.string(),
    results: v.object({
      candidateVotes: v.array(v.object({
        name: v.string(),
        votes: v.number()
      })),
      invalidVotes: v.number(),
    }),
    status: v.string(), // "PENDING", "VERIFIED", "FLAGGED"
    submittedAt: v.number(),
  }).index("by_campaign", ["campaignId"])
    .index("by_station", ["stationCode"]),

  agents: defineTable({
    campaignId: v.id("campaigns"),
    name: v.string(),
    phone: v.string(),
    designation: v.string(),
    uniqueToken: v.string(), // Used for their secure upload link
    pinCode: v.string(), // 4-digit security code
    boundDeviceId: v.optional(v.string()), // Used for device locking
  }).index("by_token", ["uniqueToken"])
    .index("by_campaign", ["campaignId"]),

  contacts: defineTable({
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    phone: v.string(),
    group: v.string(), // Extracted from filename or manually entered
  }).index("by_campaign", ["campaignId"])
    .index("by_group", ["group"])
    .index("by_phone", ["phone"]),

  smsCampaigns: defineTable({
    campaignId: v.id("campaigns"),
    message: v.string(),
    targetGroup: v.string(), // "All Contacts" or a specific group name
    status: v.string(), // "draft" | "sent"
    sentAt: v.optional(v.number()),
  }).index("by_campaign", ["campaignId"]),

  smsLogs: defineTable({
    campaignId: v.id("campaigns"),
    smsCampaignId: v.id("smsCampaigns"),
    contactId: v.id("contacts"),
    phone: v.string(),
    message: v.string(),
    status: v.string(), // "Delivered" | "Pending" | "Failed"
    sentAt: v.number(),
  }).index("by_sms_campaign", ["smsCampaignId"])
    .index("by_campaign", ["campaignId"]),

  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    image: v.optional(v.string()),
    totpEnabled: v.optional(v.boolean()),
    role: v.optional(v.string()),
    tenantId: v.optional(v.id("tenants")),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  auth_sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  tenants: defineTable({
    name: v.string(),
    licensedModules: v.optional(v.array(v.string())),
    planTier: v.optional(v.string()),
    billingStatus: v.optional(v.string()),
    senderId: v.optional(v.string()),
  }),

  audit_log: defineTable({
    actorId: v.id("users"),
    tenantId: v.optional(v.id("tenants")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.union(v.id("users"), v.id("campaigns"), v.id("agents"), v.id("submissions"), v.id("contacts"), v.id("smsCampaigns"), v.id("smsLogs"))),
    hash: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  }).index("by_tenant", ["tenantId"]),
});
