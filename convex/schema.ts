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
    actorId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
    prevHash: v.string(),
    hash: v.string(),
    createdAt: v.number(),
  }).index("by_tenant_time", ["tenantId", "createdAt"]),
});
