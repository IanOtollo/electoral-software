import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitResults = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Simple anomaly detection
    let totalCandidateVotes = 0;
    args.results.candidateVotes.forEach(cv => totalCandidateVotes += cv.votes);
    const totalVotes = totalCandidateVotes + args.results.invalidVotes;
    let status = "VERIFIED";

    if (totalVotes > 5000) {
      status = "FLAGGED";
    }

    return await ctx.db.insert("submissions", {
      campaignId: args.campaignId,
      agentId: args.agentId,
      agentName: args.agentName,
      agentPhone: args.agentPhone,
      stationName: args.stationName,
      stationCode: args.stationCode,
      results: args.results,
      status,
      submittedAt: Date.now(),
    });
  },
});

export const getLiveSubmissions = query({
  args: { campaignId: v.optional(v.id("campaigns")) },
  handler: async (ctx, args) => {
    if (!args.campaignId) return [];
    
    return await ctx.db
      .query("submissions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .take(100);
  },
});
