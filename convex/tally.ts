import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, writeAuditLog } from "./utils";

function compareCounts(
  typed: Record<string, number>,
  ocr?: Record<string, number>
): "match" | "mismatch" | "pending_review" {
  if (!ocr) return "pending_review";
  const keys = new Set([...Object.keys(typed), ...Object.keys(ocr)]);
  for (const key of keys) {
    if (Number(typed[key] ?? 0) !== Number(ocr[key] ?? 0)) return "mismatch";
  }
  return "match";
}

export const listElections = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.db
      .query("elections")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

export const createElection = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    name: v.string(),
    candidates: v.array(
      v.object({ id: v.string(), name: v.string(), party: v.string(), color: v.string() })
    ),
    totalRegisteredVoters: v.number(),
    totalPollingStations: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant?.licensedModules.includes("tally")) {
      throw new Error("Tally module not licensed");
    }

    const electionId = await ctx.db.insert("elections", {
      tenantId: args.tenantId,
      name: args.name,
      candidates: args.candidates,
      totalRegisteredVoters: args.totalRegisteredVoters,
      totalPollingStations: args.totalPollingStations,
      status: "setup",
      createdAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "election.created",
      entityType: "elections",
      entityId: electionId,
    });

    return electionId;
  },
});

export const updateElectionStatus = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    electionId: v.id("elections"),
    status: v.union(v.literal("setup"), v.literal("live"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    await ctx.db.patch(args.electionId, { status: args.status });
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "election.status_updated",
      entityType: "elections",
      entityId: args.electionId,
      metadata: { status: args.status },
    });
  },
});

export const listStations = query({
  args: {
    token: v.optional(v.string()),
    tenantId: v.id("tenants"),
    electionId: v.id("elections"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.db
      .query("polling_stations")
      .withIndex("by_tenant_election", (q) =>
        q.eq("tenantId", args.tenantId).eq("electionId", args.electionId)
      )
      .collect();
  },
});

export const importStations = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    electionId: v.id("elections"),
    stations: v.array(
      v.object({
        code: v.string(),
        name: v.string(),
        ward: v.string(),
        registeredVoters: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    let count = 0;
    for (const s of args.stations) {
      await ctx.db.insert("polling_stations", {
        tenantId: args.tenantId,
        electionId: args.electionId,
        code: s.code,
        name: s.name,
        ward: s.ward,
        registeredVoters: s.registeredVoters,
      });
      count++;
    }
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "stations.imported",
      entityType: "elections",
      entityId: args.electionId,
      metadata: { count },
    });
    return { count };
  },
});

export const assignAgent = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    stationId: v.id("polling_stations"),
    agentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    await ctx.db.patch(args.stationId, { assignedAgentId: args.agentUserId });
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "station.agent_assigned",
      entityType: "polling_stations",
      entityId: args.stationId,
    });
  },
});

export const createAgent = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    phone: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    const agentId = await ctx.db.insert("users", {
      tenantId: args.tenantId,
      role: "polling_agent",
      phone: args.phone,
      email: `${args.phone.replace(/\D/g, "")}@agent.local`,
      totpEnabled: false,
      status: "active",
      createdAt: Date.now(),
    });
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "agent.created",
      entityType: "users",
      entityId: agentId,
      metadata: { name: args.name, phone: args.phone },
    });
    return agentId;
  },
});

export const listAgents = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    return users.filter((u) => u.role === "polling_agent");
  },
});

export const submitTally = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    electionId: v.id("elections"),
    pollingStationId: v.id("polling_stations"),
    agentTypedCounts: v.any(),
    ocrExtractedCounts: v.optional(v.any()),
    formPhotoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    if (user.role !== "polling_agent" && user.role !== "tally_admin" && user.role !== "tenant_owner") {
      throw new Error("Unauthorized");
    }

    const station = await ctx.db.get(args.pollingStationId);
    if (!station) throw new Error("Station not found");

    const typed = args.agentTypedCounts as Record<string, number>;
    const totalVotes = Object.values(typed).reduce((a, b) => a + Number(b), 0);
    const isOutlier = totalVotes > station.registeredVoters;

    const existing = await ctx.db
      .query("tally_submissions")
      .withIndex("by_polling_station", (q) => q.eq("pollingStationId", args.pollingStationId))
      .first();

    const ocr = args.ocrExtractedCounts as Record<string, number> | undefined;
    let matchStatus = compareCounts(typed, ocr);
    if (isOutlier) matchStatus = "pending_review";
    if (existing) matchStatus = "pending_review";

    const submissionId = await ctx.db.insert("tally_submissions", {
      tenantId: args.tenantId,
      electionId: args.electionId,
      pollingStationId: args.pollingStationId,
      agentId: user._id,
      formPhotoStorageId: args.formPhotoStorageId,
      agentTypedCounts: typed,
      ocrExtractedCounts: ocr,
      matchStatus: existing ? "pending_review" : matchStatus === "match" ? "verified" : matchStatus,
      isCorrection: !!existing,
      submittedAt: Date.now(),
    });

    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: existing ? "tally.submission.corrected" : "tally.submission.created",
      entityType: "tally_submissions",
      entityId: submissionId,
      metadata: { isOutlier, totalVotes },
    });

    return submissionId;
  },
});

export const verifySubmission = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    submissionId: v.id("tally_submissions"),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    await ctx.db.patch(args.submissionId, {
      matchStatus: "verified",
      reviewedBy: user._id,
      reviewedAt: Date.now(),
    });
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "tally.submission.verified",
      entityType: "tally_submissions",
      entityId: args.submissionId,
    });
  },
});

export const getLiveTally = query({
  args: {
    token: v.optional(v.string()),
    tenantId: v.id("tenants"),
    electionId: v.id("elections"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    const election = await ctx.db.get(args.electionId);
    if (!election) return null;

    const submissions = await ctx.db
      .query("tally_submissions")
      .withIndex("by_tenant_election", (q) =>
        q.eq("tenantId", args.tenantId).eq("electionId", args.electionId)
      )
      .collect();

    const verified = submissions.filter((s) => s.matchStatus === "verified");
    const pending = submissions.filter((s) => s.matchStatus === "pending_review");
    const totals: Record<string, number> = {};

    for (const sub of verified) {
      for (const [id, count] of Object.entries(sub.agentTypedCounts as Record<string, number>)) {
        totals[id] = (totals[id] || 0) + Number(count);
      }
    }

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    const stations = await ctx.db
      .query("polling_stations")
      .withIndex("by_tenant_election", (q) =>
        q.eq("tenantId", args.tenantId).eq("electionId", args.electionId)
      )
      .collect();

    const wardBreakdown: Record<string, { verified: number; total: number }> = {};
    for (const station of stations) {
      if (!wardBreakdown[station.ward]) {
        wardBreakdown[station.ward] = { verified: 0, total: 0 };
      }
      wardBreakdown[station.ward].total++;
      const hasVerified = verified.some((s) => s.pollingStationId === station._id);
      if (hasVerified) wardBreakdown[station.ward].verified++;
    }

    return {
      election,
      verifiedCount: verified.length,
      totalStations: stations.length || election.totalPollingStations,
      pendingReview: pending.length,
      totals,
      grandTotal,
      candidates: election.candidates,
      wardBreakdown,
      percentReported:
        stations.length > 0
          ? Math.round((verified.length / stations.length) * 100)
          : 0,
    };
  },
});

export const listSubmissions = query({
  args: {
    token: v.optional(v.string()),
    tenantId: v.id("tenants"),
    electionId: v.id("elections"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.db
      .query("tally_submissions")
      .withIndex("by_tenant_election", (q) =>
        q.eq("tenantId", args.tenantId).eq("electionId", args.electionId)
      )
      .order("desc")
      .collect();
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string(), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.storage.generateUploadUrl();
  },
});
