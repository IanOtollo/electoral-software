import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { randomToken, sha256Hex, verifyPassword } from "./lib/crypto";
import { audit } from "./lib/audit";

const SESSION_TTL = 1000 * 60 * 60 * 12;
const MAX_PIN_FAILURES = 5;
const LOCK_MS = 1000 * 60 * 15;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const deny = (message: string) => new ConvexError({ code: "UNAUTHENTICATED", message });

/** Resolve an agent session. These functions are public, so everything is checked here. */
async function requireAgent(ctx: QueryCtx | MutationCtx, session: string) {
  const hash = await sha256Hex(session);
  const s = await ctx.db.query("agent_sessions").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).unique();
  if (!s || s.expiresAt < Date.now()) throw deny("Your session ended. Open your link and enter your PIN again.");
  const agent = await ctx.db.get(s.agentId);
  if (!agent || agent.status !== "active") throw deny("This access has been switched off. Contact your campaign.");
  const tenant = await ctx.db.get(agent.tenantId);
  if (!tenant || tenant.status === "suspended") throw deny("This campaign is not active.");
  return { agent, tenant };
}

/**
 * Open the agent link: link token + PIN + this phone. Returns a result rather than
 * throwing so failed-PIN counts are saved and the lockout works.
 */
export const unlock = mutation({
  args: { token: v.string(), pin: v.string(), deviceId: v.string() },
  handler: async (ctx, args) => {
    const hash = await sha256Hex(args.token);
    const agent = await ctx.db.query("agents").withIndex("by_token_hash", (q) => q.eq("tokenHash", hash)).unique();
    return await unlockInner(ctx, agent, args, Date.now());
  },
});

async function unlockInner(
  ctx: MutationCtx,
  agent: Doc<"agents"> | null,
  args: { token: string; pin: string; deviceId: string },
  now: number,
) {
  if (!agent) return { ok: false as const, reason: "invalid" as const };
  if (agent.status !== "active") return { ok: false as const, reason: "disabled" as const };
  if (agent.lockedUntil && agent.lockedUntil > now) {
    return { ok: false as const, reason: "locked" as const, retryAfterMs: agent.lockedUntil - now };
  }
  const valid = /^\d{6}$/.test(args.pin) && (await verifyPassword(args.pin, agent.pinHash));
  if (!valid) {
    const failures = agent.pinFailures + 1;
    await ctx.db.patch(agent._id, { pinFailures: failures, lockedUntil: failures >= MAX_PIN_FAILURES ? now + LOCK_MS : undefined });
    await audit(ctx, { tenantId: agent.tenantId, action: failures >= MAX_PIN_FAILURES ? "agent.locked" : "agent.sign_in_failed", entityType: "agents", entityId: agent._id, metadata: { agent: agent.name, reason: "wrong_pin", attempts: failures } });
    return { ok: false as const, reason: "invalid" as const };
  }
  const deviceHash = await sha256Hex(args.deviceId);
  if (agent.deviceHash && agent.deviceHash !== deviceHash) {
    await audit(ctx, { tenantId: agent.tenantId, action: "agent.sign_in_failed", entityType: "agents", entityId: agent._id, metadata: { agent: agent.name, reason: "other_device" } });
    return { ok: false as const, reason: "other_device" as const };
  }

  await ctx.db.patch(agent._id, { pinFailures: 0, lockedUntil: undefined, deviceHash, lastSeenAt: now });
  const session = randomToken(24);
  await ctx.db.insert("agent_sessions", { agentId: agent._id, tokenHash: await sha256Hex(session), expiresAt: now + SESSION_TTL });
  await audit(ctx, { tenantId: agent.tenantId, action: "agent.signed_in", entityType: "agents", entityId: agent._id, metadata: { agent: agent.name, firstDevice: !agent.deviceHash } });
  return { ok: true as const, session };
}

/** What the agent screen needs: who they are, their stations, the candidates, and what they already sent. */
export const me = query({
  args: { session: v.string() },
  handler: async (ctx, args) => {
    const { agent, tenant } = await requireAgent(ctx, args.session);
    const candidates = await ctx.db.query("candidates").withIndex("by_tenant", (q) => q.eq("tenantId", agent.tenantId)).collect();
    const stations = await Promise.all(
      agent.stationCodes.map(async (code) => {
        const st = await ctx.db.query("stations").withIndex("by_code", (q) => q.eq("code", code)).unique();
        const subs = await ctx.db.query("submissions").withIndex("by_tenant_station", (q) => q.eq("tenantId", agent.tenantId).eq("stationCode", code)).collect();
        const cur = subs.find((s) => s.isCurrent);
        return {
          code,
          name: st?.name ?? code,
          voters: st?.voters ?? 0,
          submitted: cur
            ? { at: cur.submittedAt, votes: cur.votes, rejected: cur.rejected, flags: cur.flags, version: subs.length }
            : null,
        };
      }),
    );
    return {
      agentName: agent.name,
      campaign: tenant.name,
      office: tenant.office ?? null,
      candidates: candidates.sort((a, b) => a.order - b.order).map((c) => ({ id: c._id, name: c.name, party: c.party ?? "" })),
      stations,
    };
  },
});

export const generateUploadUrl = mutation({
  args: { session: v.string() },
  handler: async (ctx, args) => {
    await requireAgent(ctx, args.session);
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: {
    session: v.string(),
    stationCode: v.string(),
    votes: v.array(v.object({ candidateId: v.id("candidates"), votes: v.number() })),
    rejected: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { agent } = await requireAgent(ctx, args.session);
    const bad = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });

    if (!agent.stationCodes.includes(args.stationCode)) throw bad("That polling station is not assigned to you");
    const station = await ctx.db.query("stations").withIndex("by_code", (q) => q.eq("code", args.stationCode)).unique();
    if (!station) throw bad("Polling station not found");

    const candidates = await ctx.db.query("candidates").withIndex("by_tenant", (q) => q.eq("tenantId", agent.tenantId)).collect();
    const ids = new Set(candidates.map((c) => c._id as string));
    const seen = new Set<string>();
    for (const row of args.votes) {
      if (!ids.has(row.candidateId)) throw bad("Unknown candidate");
      if (seen.has(row.candidateId)) throw bad("A candidate was listed twice");
      seen.add(row.candidateId);
    }
    if (seen.size !== ids.size) throw bad("Enter votes for every candidate (use 0 where there are none)");
    const whole = (n: number) => Number.isInteger(n) && n >= 0 && n <= 1_000_000;
    if (!args.votes.every((r) => whole(r.votes)) || !whole(args.rejected)) throw bad("Votes must be whole numbers, 0 or more");

    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) throw bad("The photo did not upload. Please try again.");
    if (!meta.contentType?.startsWith("image/")) throw bad("The Form 34A photo must be an image");
    if (meta.size > MAX_PHOTO_BYTES) throw bad("The photo is too large. Retake it a little further away.");

    const totalValid = args.votes.reduce((n, r) => n + r.votes, 0);
    const flags: string[] = [];
    if (totalValid + args.rejected > station.voters) flags.push("OVER_REGISTERED");
    if (totalValid + args.rejected === 0) flags.push("ZERO_BALLOTS");

    const previous = await ctx.db.query("submissions").withIndex("by_tenant_station", (q) => q.eq("tenantId", agent.tenantId).eq("stationCode", args.stationCode)).collect();
    for (const p of previous) if (p.isCurrent) await ctx.db.patch(p._id, { isCurrent: false });
    await ctx.db.insert("submissions", {
      tenantId: agent.tenantId,
      agentId: agent._id,
      stationCode: args.stationCode,
      votes: args.votes,
      rejected: args.rejected,
      totalValid,
      storageId: args.storageId,
      flags,
      isCurrent: true,
      submittedAt: Date.now(),
    });
    await ctx.db.patch(agent._id, { lastSeenAt: Date.now() });
    await audit(ctx, {
      tenantId: agent.tenantId, action: previous.length > 0 ? "result.corrected" : "result.submitted", entityType: "stations", entityId: args.stationCode,
      metadata: { agent: agent.name, station: station.name, totalValid, rejected: args.rejected, version: previous.length + 1, flags },
    });
    return { ok: true as const, flags, version: previous.length + 1 };
  },
});
