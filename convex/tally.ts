import { query } from "./_generated/server";
import { v } from "convex/values";
import { authorize } from "./lib/guard";

/**
 * The aspirant's private tally, built only from their own agents' submissions.
 * Nothing here is published publicly.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "tally:read");
    if (!tenantId) return null;
    const candidates = await ctx.db.query("candidates").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    const agents = await ctx.db.query("agents").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    const current = await ctx.db.query("submissions").withIndex("by_tenant_current", (q) => q.eq("tenantId", tenantId).eq("isCurrent", true)).collect();

    const assigned = new Set(agents.filter((a) => a.status === "active").flatMap((a) => a.stationCodes));
    const totals = new Map<string, number>(candidates.map((c) => [c._id as string, 0]));
    let rejected = 0;
    let registeredReported = 0;
    let flagged = 0;
    for (const s of current) {
      for (const r of s.votes) totals.set(r.candidateId, (totals.get(r.candidateId) ?? 0) + r.votes);
      rejected += s.rejected;
      if (s.flags.length) flagged++;
      const st = await ctx.db.query("stations").withIndex("by_code", (q) => q.eq("code", s.stationCode)).unique();
      registeredReported += st?.voters ?? 0;
    }
    const valid = [...totals.values()].reduce((a, b) => a + b, 0);
    return {
      candidates: candidates
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c._id, name: c.name, party: c.party ?? "", isOurs: c.isOurs, votes: totals.get(c._id) ?? 0 })),
      validVotes: valid,
      rejected,
      stationsAssigned: assigned.size,
      stationsReported: current.length,
      flagged,
      turnoutPercent: registeredReported > 0 ? ((valid + rejected) / registeredReported) * 100 : null,
      agents: { total: agents.length, active: agents.filter((a) => a.status === "active").length },
    };
  },
});

export const stations = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "tally:read");
    if (!tenantId) return [];
    const agents = await ctx.db.query("agents").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    const current = await ctx.db.query("submissions").withIndex("by_tenant_current", (q) => q.eq("tenantId", tenantId).eq("isCurrent", true)).collect();
    const byStation = new Map(current.map((s) => [s.stationCode, s]));
    const rows = new Map<string, { code: string; agents: string[] }>();
    for (const a of agents) {
      if (a.status !== "active") continue;
      for (const code of a.stationCodes) {
        const r = rows.get(code) ?? { code, agents: [] };
        r.agents.push(a.name);
        rows.set(code, r);
      }
    }
    return await Promise.all(
      [...rows.values()].map(async (r) => {
        const st = await ctx.db.query("stations").withIndex("by_code", (q) => q.eq("code", r.code)).unique();
        const sub = byStation.get(r.code);
        return {
          code: r.code,
          name: st?.name ?? r.code,
          voters: st?.voters ?? 0,
          agents: r.agents,
          status: !sub ? ("awaiting" as const) : sub.flags.length ? ("flagged" as const) : ("reported" as const),
          flags: sub?.flags ?? [],
          submittedAt: sub?.submittedAt ?? null,
          votes: sub ? sub.votes.map((x) => ({ candidateId: x.candidateId, votes: x.votes })) : [],
          rejected: sub?.rejected ?? null,
        };
      }),
    );
  },
});

/** One station's current submission with its Form 34A photo. */
export const submission = query({
  args: { stationCode: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = await authorize(ctx, "tally:read");
    if (!tenantId) return null;
    const all = await ctx.db.query("submissions").withIndex("by_tenant_station", (q) => q.eq("tenantId", tenantId).eq("stationCode", args.stationCode)).collect();
    const cur = all.find((s) => s.isCurrent);
    if (!cur) return null;
    const agent = await ctx.db.get(cur.agentId);
    return {
      imageUrl: await ctx.storage.getUrl(cur.storageId),
      submittedAt: cur.submittedAt,
      agent: agent?.name ?? "Unknown",
      flags: cur.flags,
      rejected: cur.rejected,
      votes: cur.votes,
      versions: all.length,
    };
  },
});
