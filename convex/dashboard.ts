import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireTenantAccess } from "./utils";

export const getOverview = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);

    const voters = await ctx.db
      .query("voters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const activeVoters = voters.filter((v) => !v.deletedAt);

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const elections = await ctx.db
      .query("elections")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const liveElection = elections.find((e) => e.status === "live");

    let tallyStats = null;
    if (liveElection) {
      const submissions = await ctx.db
        .query("tally_submissions")
        .withIndex("by_tenant_election", (q) =>
          q.eq("tenantId", args.tenantId).eq("electionId", liveElection._id)
        )
        .collect();
      tallyStats = {
        verified: submissions.filter((s) => s.matchStatus === "verified").length,
        pending: submissions.filter((s) => s.matchStatus === "pending_review").length,
        total: liveElection.totalPollingStations,
      };
    }

    return {
      totalContacts: activeVoters.length,
      optedOut: activeVoters.filter((v) => v.optedOut).length,
      campaignsSent: campaigns.filter((c) => c.status === "sent").length,
      campaignsTotal: campaigns.length,
      electionsTotal: elections.length,
      liveElection: liveElection?.name ?? null,
      tallyStats,
    };
  },
});
