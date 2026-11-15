import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { authorize } from "./lib/guard";
import { audit } from "./lib/audit";
import { hashPassword, randomToken, sha256Hex } from "./lib/crypto";
import { normalizeKenyanPhone } from "./lib/phone";

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });
const MAX_STATIONS_PER_AGENT = 10;

function newPin() {
  return String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
}

/** Station must exist and lie inside the area the campaign is contesting. */
async function checkStations(ctx: MutationCtx, tenant: Doc<"tenants">, codes: string[]) {
  if (codes.length < 1) throw fail("Assign at least one polling station");
  if (codes.length > MAX_STATIONS_PER_AGENT) throw fail(`An agent can cover at most ${MAX_STATIONS_PER_AGENT} stations`);
  if (new Set(codes).size !== codes.length) throw fail("A station was listed twice");
  const area = tenant.areaCode ?? "";
  for (const code of codes) {
    const st = await ctx.db.query("stations").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!st) throw fail(`Polling station ${code} was not found`);
    if (area && !(st.county === area || st.constituency === area || st.ward === area)) {
      throw fail(`${st.name} is outside the area you are contesting`);
    }
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "tally:read");
    if (!tenantId) return [];
    const agents = await ctx.db.query("agents").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).collect();
    const current = await ctx.db.query("submissions").withIndex("by_tenant_current", (q) => q.eq("tenantId", tenantId).eq("isCurrent", true)).collect();
    const reported = new Set(current.map((s) => s.stationCode));
    return await Promise.all(
      agents
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (a) => ({
          id: a._id,
          name: a.name,
          phone: a.phone,
          status: a.status,
          bound: !!a.deviceHash,
          lastSeenAt: a.lastSeenAt ?? null,
          stations: await Promise.all(
            a.stationCodes.map(async (code) => {
              const st = await ctx.db.query("stations").withIndex("by_code", (q) => q.eq("code", code)).unique();
              return { code, name: st?.name ?? code, reported: reported.has(code) };
            }),
          ),
        })),
    );
  },
});

/** Returns the link token and PIN once. Only their hashes are stored. */
export const create = mutation({
  args: { name: v.string(), phone: v.string(), stationCodes: v.array(v.string()) },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "tally:manage");
    if (!tenantId) throw fail("No workspace");
    const tenant = await ctx.db.get(tenantId);
    if (!tenant?.office) throw fail("Set up your campaign (office, area and candidates) before adding agents");
    const name = args.name.trim();
    if (name.length < 2) throw fail("Enter the agent's name");
    const phone = normalizeKenyanPhone(args.phone);
    if (!phone) throw fail("Enter a valid Kenyan mobile number, for example 0712 345 678");
    await checkStations(ctx, tenant, args.stationCodes);

    const token = randomToken(24);
    const pin = newPin();
    const id = await ctx.db.insert("agents", {
      tenantId,
      name,
      phone,
      stationCodes: args.stationCodes,
      tokenHash: await sha256Hex(token),
      pinHash: await hashPassword(pin),
      status: "active",
      pinFailures: 0,
      createdAt: Date.now(),
    });
    await audit(ctx, { tenantId, actorId: user._id, action: "agent.created", entityType: "agents", entityId: id, metadata: { stations: args.stationCodes.length } });
    return { id, token, pin };
  },
});

export const update = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    stationCodes: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
  },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "tally:manage");
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.tenantId !== tenantId || !tenantId) throw fail("Agent not found");
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) throw fail("No workspace");
    const patch: Partial<Doc<"agents">> = {};
    if (args.name !== undefined) {
      if (args.name.trim().length < 2) throw fail("Enter the agent's name");
      patch.name = args.name.trim();
    }
    if (args.phone !== undefined) {
      const phone = normalizeKenyanPhone(args.phone);
      if (!phone) throw fail("Enter a valid Kenyan mobile number");
      patch.phone = phone;
    }
    if (args.stationCodes !== undefined) {
      await checkStations(ctx, tenant, args.stationCodes);
      patch.stationCodes = args.stationCodes;
    }
    if (args.status !== undefined) patch.status = args.status;
    await ctx.db.patch(agent._id, patch);
    await audit(ctx, { tenantId, actorId: user._id, action: "agent.updated", entityType: "agents", entityId: agent._id, metadata: { fields: Object.keys(patch) } });
  },
});

/** New link and PIN, forget the bound phone, clear any lockout. */
export const resetAccess = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "tally:manage");
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.tenantId !== tenantId || !tenantId) throw fail("Agent not found");
    const token = randomToken(24);
    const pin = newPin();
    await ctx.db.patch(agent._id, {
      tokenHash: await sha256Hex(token),
      pinHash: await hashPassword(pin),
      deviceHash: undefined,
      pinFailures: 0,
      lockedUntil: undefined,
    });
    // End any live agent sessions for this agent.
    const sessions = await ctx.db.query("agent_sessions").collect();
    for (const s of sessions) if (s.agentId === agent._id) await ctx.db.delete(s._id);
    await audit(ctx, { tenantId, actorId: user._id, action: "agent.access_reset", entityType: "agents", entityId: agent._id });
    return { token, pin };
  },
});

/** Stations of a ward, for the agent picker. Any signed-in workspace user may look these up. */
export const stationsInWard = query({
  args: { wardCode: v.string() },
  handler: async (ctx, args) => {
    const { tenantId } = await authorize(ctx, "tally:read");
    if (!tenantId) return [];
    const tenant = await ctx.db.get(tenantId);
    const area = tenant?.areaCode ?? "";
    const rows = await ctx.db.query("stations").withIndex("by_ward", (q) => q.eq("ward", args.wardCode)).collect();
    return rows
      .filter((s) => !area || s.county === area || s.constituency === area || s.ward === area)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((s) => ({ code: s.code, name: s.name, stream: s.stream, voters: s.voters }));
  },
});

export type AgentId = Id<"agents">;
