import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(
  v.literal("super_admin"),
  v.literal("tenant_admin"),
  v.literal("campaign_manager"),
  v.literal("comms_officer"),
  v.literal("tally_clerk"),
  v.literal("field_agent"),
  v.literal("viewer"),
);

const office = v.union(
  v.literal("president"), v.literal("governor"), v.literal("senator"),
  v.literal("woman_rep"), v.literal("mp"), v.literal("mca"),
);

export default defineSchema({
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    status: v.union(v.literal("trial"), v.literal("active"), v.literal("suspended")),
    plan: v.union(
      v.literal("starter"),
      v.literal("constituency"),
      v.literal("county"),
      v.literal("national"),
    ),
    modules: v.array(v.union(v.literal("sms"), v.literal("tally"))),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    senderId: v.optional(v.string()),
    // Campaign profile, set by the aspirant after sign-up
    office: v.optional(office),
    areaCode: v.optional(v.string()), // IEBC code of the contested area ("" = national)
    party: v.optional(v.string()),
    // SMS segments available. Granted by the platform admin until payments exist.
    smsCredits: v.optional(v.number()),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  users: defineTable({
    // undefined for platform super admins
    tenantId: v.optional(v.id("tenants")),
    email: v.string(), // always lower-cased
    name: v.string(),
    role,
    status: v.union(v.literal("active"), v.literal("suspended")),
    passwordHash: v.string(), // pbkdf2$iterations$salt$hash
    lastLoginAt: v.optional(v.number()),
    termsVersion: v.optional(v.string()),
    termsAcceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_tenant", ["tenantId"]),

  // Revocable server-side sessions. The browser holds only a signed cookie
  // carrying `sid`; deleting/revoking the row kills access immediately.
  sessions: defineTable({
    sid: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_sid", ["sid"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  invites: defineTable({
    tenantId: v.optional(v.id("tenants")),
    email: v.string(),
    role,
    tokenHash: v.string(), // sha256 of the token; the token itself is never stored
    invitedBy: v.id("users"),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_tenant", ["tenantId"]),

  login_attempts: defineTable({
    key: v.string(), // lower-cased email
    failures: v.number(),
    windowStart: v.number(),
    lockedUntil: v.optional(v.number()),
  })
    .index("by_key", ["key"])
    .index("by_window", ["windowStart"]),

  // IEBC 2022 polling stations (streams). Imported once from data/iebc/stations.csv.
  stations: defineTable({
    code: v.string(), // 15-digit IEBC station code
    county: v.string(),
    constituency: v.string(),
    ward: v.string(),
    centre: v.string(),
    stream: v.string(),
    name: v.string(),
    voters: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_ward", ["ward"])
    .index("by_constituency", ["constituency"])
    .index("by_county", ["county"]),

  // The candidates in the aspirant's race (the aspirant plus their opponents).
  candidates: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    party: v.optional(v.string()),
    isOurs: v.boolean(),
    order: v.number(),
  }).index("by_tenant", ["tenantId"]),

  // Field agents. They are not users: they open a private link and enter a PIN.
  agents: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    phone: v.string(), // +254...
    stationCodes: v.array(v.string()),
    tokenHash: v.string(), // sha256 of the link token
    pinHash: v.string(), // pbkdf2 of the PIN
    deviceHash: v.optional(v.string()), // first phone to unlock is bound
    status: v.union(v.literal("active"), v.literal("disabled")),
    pinFailures: v.number(),
    lockedUntil: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_token_hash", ["tokenHash"]),

  agent_sessions: defineTable({
    agentId: v.id("agents"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_expiry", ["expiresAt"]),

  // One row per submission. A re-submission supersedes the previous current row.
  submissions: defineTable({
    tenantId: v.id("tenants"),
    agentId: v.id("agents"),
    stationCode: v.string(),
    votes: v.array(v.object({ candidateId: v.id("candidates"), votes: v.number() })),
    rejected: v.number(),
    totalValid: v.number(),
    storageId: v.id("_storage"), // photo of the signed Form 34A
    flags: v.array(v.string()),
    isCurrent: v.boolean(),
    submittedAt: v.number(),
  })
    .index("by_tenant_current", ["tenantId", "isCurrent"])
    .index("by_tenant_station", ["tenantId", "stationCode"]),

  // Contacts a campaign may message. Every contact carries the record of how consent was given.
  contacts: defineTable({
    tenantId: v.id("tenants"),
    name: v.optional(v.string()),
    phone: v.string(), // +254...
    group: v.optional(v.string()),
    consentStatus: v.union(v.literal("opted_in"), v.literal("opted_out")),
    consentSource: v.string(), // how/where the person opted in, e.g. "signed membership forms 2026"
    consentAt: v.number(),
    consentBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phone"])
    .index("by_tenant_group", ["tenantId", "group"])
    .index("by_phone", ["phone"]),

  // Running totals so counts never need a full scan (a query may read at most ~16k documents).
  contact_stats: defineTable({
    tenantId: v.id("tenants"),
    total: v.number(),
    optedIn: v.number(),
    groups: v.array(v.object({ name: v.string(), count: v.number() })), // opted-in contacts per group
  }).index("by_tenant", ["tenantId"]),

  // A political message request. It follows the Communications Authority process: it cannot be sent at once,
  // it is scheduled at least 48 hours ahead with the sponsor's signed authorisation and ID, and it is vetted
  // by the network before it goes out.
  sms_messages: defineTable({
    tenantId: v.id("tenants"),
    createdBy: v.id("users"),
    body: v.string(),
    language: v.union(v.literal("en"), v.literal("sw")),
    sponsorName: v.string(),
    targetGroup: v.optional(v.string()), // undefined = all opted-in contacts
    recipients: v.number(), // opted-in contacts at submission
    segments: v.number(), // SMS parts per recipient
    scheduledFor: v.number(),
    authorizationStorageId: v.id("_storage"), // signed letter from the sponsor
    identityStorageId: v.id("_storage"), // certified ID or party registration
    status: v.union(
      v.literal("submitted"), v.literal("approved"), v.literal("refused"), v.literal("cancelled"),
      v.literal("sending"), v.literal("sent"), v.literal("failed"),
    ),
    // Delivery progress, written only from what Africa's Talking actually reports.
    cursor: v.optional(v.string()), // where the sender stopped, so a resumed run never repeats people
    sendingSince: v.optional(v.number()),
    accepted: v.optional(v.number()), // recipients the network took
    rejected: v.optional(v.number()), // recipients it refused
    delivered: v.optional(v.number()), // handsets that confirmed receipt
    failureNote: v.optional(v.string()),
    reviewNote: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_status", ["status", "scheduledFor"]),

  // One row per person a message was handed to, so delivery reports can be matched back to it.
  sms_recipients: defineTable({
    messageId: v.id("sms_messages"),
    tenantId: v.id("tenants"),
    phone: v.string(),
    providerId: v.optional(v.string()),
    status: v.union(v.literal("accepted"), v.literal("delivered"), v.literal("failed")),
    reason: v.optional(v.string()),
  })
    .index("by_message", ["messageId"])
    .index("by_tenant", ["tenantId"])
    .index("by_provider_id", ["providerId"]),

  // Generic fixed-window limiter (sign-up per IP, etc).
  rate_limits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_window", ["windowStart"]),

  // Append-only, hash-chained per tenant (platform events use tenantId = undefined).
  audit_log: defineTable({
    tenantId: v.optional(v.id("tenants")),
    actorId: v.optional(v.id("users")), // empty for events the system itself records (delivery reports, STOP replies)
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
    prevHash: v.string(),
    hash: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant_time", ["tenantId", "createdAt"])
    .index("by_time", ["createdAt"]), // platform-wide view for administrators

  // One-time password reset links, issued by a platform administrator.
  password_resets: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(), // sha256 of the token; the token itself is never stored
    createdBy: v.id("users"),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_user", ["userId"]),

  // Platform-wide switches, set by the administrator (one row, key "main").
  platform_settings: defineTable({
    key: v.string(),
    signupsOpen: v.boolean(),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
