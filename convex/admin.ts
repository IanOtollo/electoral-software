import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { authorize } from "./lib/guard";
import { audit } from "./lib/audit";
import { randomToken, sha256Hex } from "./lib/crypto";

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });
const DAY = 24 * 60 * 60 * 1000;
const TENANT_CAP = 300; // dashboards read per workspace; beyond this the figures are marked approximate

/** Light per-workspace figures. Everything here is numbers about a workspace, never voter or message content. */
async function workspaceFigures(ctx: QueryCtx, tenantId: Id<"tenants">) {
  const agents = await ctx.db.query("agents").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).take(2000);
  const current = await ctx.db.query("submissions").withIndex("by_tenant_current", (q) => q.eq("tenantId", tenantId).eq("isCurrent", true)).take(5000);
  const assigned = new Set(agents.filter((a) => a.status === "active").flatMap((a) => a.stationCodes));
  return {
    agents: agents.length,
    agentsActive: agents.filter((a) => a.status === "active").length,
    stationsAssigned: assigned.size,
    stationsReported: current.length,
    flagged: current.filter((s) => s.flags.length > 0).length,
  };
}

async function names(ctx: QueryCtx, userIds: (Id<"users"> | undefined)[], tenantIds: (Id<"tenants"> | undefined)[]) {
  const u = new Map<string, string>();
  const t = new Map<string, string>();
  for (const id of new Set(userIds.filter(Boolean) as Id<"users">[])) u.set(id, (await ctx.db.get(id))?.name ?? "Unknown");
  for (const id of new Set(tenantIds.filter(Boolean) as Id<"tenants">[])) t.set(id, (await ctx.db.get(id))?.name ?? "Deleted workspace");
  return { user: (id?: Id<"users">) => (id ? (u.get(id) ?? "Unknown") : "System"), tenant: (id?: Id<"tenants">) => (id ? (t.get(id) ?? "Deleted workspace") : "Platform") };
}

/* ------------------------------ dashboard ------------------------------ */

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "tenants:manage");
    const tenants = await ctx.db.query("tenants").order("desc").collect();
    const status = { trial: 0, active: 0, suspended: 0 };
    let credits = 0;
    for (const t of tenants) {
      status[t.status]++;
      credits += t.smsCredits ?? 0;
    }
    const users = await ctx.db.query("users").take(5001);
    const roles: Record<string, number> = {};
    for (const u of users) roles[u.role] = (roles[u.role] ?? 0) + 1;

    let agents = 0, reported = 0, flagged = 0, assigned = 0;
    for (const t of tenants.slice(0, TENANT_CAP)) {
      const f = await workspaceFigures(ctx, t._id);
      agents += f.agents; reported += f.stationsReported; flagged += f.flagged; assigned += f.stationsAssigned;
    }
    const pending = await ctx.db.query("sms_messages").withIndex("by_status", (q) => q.eq("status", "submitted")).take(500);
    const recent = await ctx.db.query("audit_log").withIndex("by_time").order("desc").take(12);
    const n = await names(ctx, recent.map((r) => r.actorId), recent.map((r) => r.tenantId));
    const week = Date.now() - 7 * DAY;

    return {
      approximate: tenants.length > TENANT_CAP || users.length > 5000,
      workspaces: { total: tenants.length, ...status, newThisWeek: tenants.filter((t) => t.createdAt > week).length },
      users: { total: users.length, byRole: roles },
      field: { agents, stationsAssigned: assigned, stationsReported: reported, flagged },
      messages: { pendingApproval: pending.length, oldestPending: pending[0]?.createdAt ?? null },
      smsCreditsOutstanding: credits,
      newest: tenants.slice(0, 6).map((t) => ({ id: t._id, name: t.name, slug: t.slug, status: t.status, createdAt: t.createdAt })),
      activity: recent.map((r) => ({ id: r._id, action: r.action, actor: n.user(r.actorId), workspace: n.tenant(r.tenantId), createdAt: r.createdAt })),
    };
  },
});

/* ------------------------------ workspaces ------------------------------ */

export const workspaces = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "tenants:manage");
    const tenants = await ctx.db.query("tenants").order("desc").take(TENANT_CAP);
    return await Promise.all(
      tenants.map(async (t) => {
        const users = await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).collect();
        const f = await workspaceFigures(ctx, t._id);
        return {
          id: t._id, name: t.name, slug: t.slug, status: t.status, plan: t.plan, modules: t.modules, credits: t.smsCredits ?? 0,
          office: t.office ?? null, createdAt: t.createdAt, users: users.filter((u) => u.status === "active").length, ...f,
        };
      }),
    );
  },
});

export const workspace = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await authorize(ctx, "tenants:manage");
    const t = await ctx.db.get(args.tenantId);
    if (!t) return null;
    const users = await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).collect();
    const candidates = await ctx.db.query("candidates").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).collect();
    const figures = await workspaceFigures(ctx, t._id);
    const msgs = await ctx.db.query("sms_messages").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).take(500);
    const msgCounts: Record<string, number> = {};
    for (const m of msgs) msgCounts[m.status] = (msgCounts[m.status] ?? 0) + 1;
    const stats = await ctx.db.query("contact_stats").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).unique();
    const invites = (await ctx.db.query("invites").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).collect()).filter((i) => !i.acceptedAt && !i.revokedAt && i.expiresAt > Date.now());
    const log = await ctx.db.query("audit_log").withIndex("by_tenant_time", (q) => q.eq("tenantId", t._id)).order("desc").take(15);
    const n = await names(ctx, log.map((l) => l.actorId), []);
    return {
      tenant: { id: t._id, name: t.name, slug: t.slug, status: t.status, plan: t.plan, modules: t.modules, credits: t.smsCredits ?? 0, senderId: t.senderId ?? null, contactEmail: t.contactEmail, office: t.office ?? null, areaCode: t.areaCode ?? null, party: t.party ?? null, createdAt: t.createdAt },
      users: users.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, status: u.status, lastLoginAt: u.lastLoginAt ?? null })),
      candidates: candidates.length,
      figures,
      messages: msgCounts,
      contacts: { total: stats?.total ?? 0, optedIn: stats?.optedIn ?? 0 },
      invites: invites.map((i) => ({ id: i._id, email: i.email, role: i.role, expiresAt: i.expiresAt })),
      activity: log.map((l) => ({ id: l._id, action: l.action, actor: n.user(l.actorId), createdAt: l.createdAt })),
    };
  },
});

/* ------------------------------ users ------------------------------ */

export const users = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "tenants:manage");
    const rows = await ctx.db.query("users").order("desc").take(500);
    const n = await names(ctx, [], rows.map((r) => r.tenantId));
    return rows.map((u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, status: u.status, workspace: n.tenant(u.tenantId), workspaceId: u.tenantId ?? null, lastLoginAt: u.lastLoginAt ?? null, createdAt: u.createdAt }));
  },
});

/** Platform administrators are managed by nobody but themselves, so nothing here may touch one. */
async function target(ctx: { db: { get: (id: Id<"users">) => Promise<Doc<"users"> | null> } }, userId: Id<"users">, actorId: Id<"users">) {
  const u = await ctx.db.get(userId);
  if (!u) throw fail("User not found");
  if (u.role === "super_admin") throw fail("Platform administrator accounts cannot be changed from here");
  if (u._id === actorId) throw fail("You cannot do that to your own account");
  return u;
}

async function revokeSessions(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
  let n = 0;
  for (const s of sessions) if (!s.revokedAt) { await ctx.db.patch(s._id, { revokedAt: Date.now() }); n++; }
  return n;
}

export const setUserStatus = mutation({
  args: { userId: v.id("users"), status: v.union(v.literal("active"), v.literal("suspended")) },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const u = await target(ctx, args.userId, user._id);
    await ctx.db.patch(u._id, { status: args.status });
    if (args.status === "suspended") await revokeSessions(ctx, u._id);
    await audit(ctx, { tenantId: u.tenantId, actorId: user._id, action: args.status === "active" ? "platform.user_reactivated" : "platform.user_suspended", entityType: "users", entityId: u._id, metadata: { email: u.email } });
  },
});

export const signOutUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const u = await target(ctx, args.userId, user._id);
    const n = await revokeSessions(ctx, u._id);
    await audit(ctx, { tenantId: u.tenantId, actorId: user._id, action: "platform.user_signed_out", entityType: "users", entityId: u._id, metadata: { sessions: n } });
    return { sessions: n };
  },
});

/** A one-time link the person opens to choose a new password. Valid for 24 hours; only its hash is stored. */
export const createPasswordReset = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const u = await target(ctx, args.userId, user._id);
    const token = randomToken(32);
    await ctx.db.insert("password_resets", { userId: u._id, tokenHash: await sha256Hex(token), createdBy: user._id, expiresAt: Date.now() + DAY, createdAt: Date.now() });
    await audit(ctx, { tenantId: u.tenantId, actorId: user._id, action: "platform.password_reset_issued", entityType: "users", entityId: u._id, metadata: { email: u.email } });
    return { token, email: u.email };
  },
});

/** Replace an unused invitation with a fresh link (the old one stops working). */
export const reissueInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const old = await ctx.db.get(args.inviteId);
    if (!old || old.acceptedAt) throw fail("That invitation is no longer open");
    await ctx.db.patch(old._id, { revokedAt: Date.now() });
    const token = randomToken(32);
    const id = await ctx.db.insert("invites", { tenantId: old.tenantId, email: old.email, role: old.role, tokenHash: await sha256Hex(token), invitedBy: user._id, expiresAt: Date.now() + 72 * 60 * 60 * 1000, createdAt: Date.now() });
    await audit(ctx, { tenantId: old.tenantId, actorId: user._id, action: "platform.invite_reissued", entityType: "invites", entityId: id, metadata: { email: old.email } });
    return { token, email: old.email };
  },
});

/* ------------------------------ workspace removal ------------------------------ */

/** Closing an account: stops access at once, then removes everything in small batches in the background. */
export const deleteWorkspace = mutation({
  args: { tenantId: v.id("tenants"), confirmName: v.string() },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const t = await ctx.db.get(args.tenantId);
    if (!t) throw fail("Workspace not found");
    if (args.confirmName.trim() !== t.name) throw fail("Type the workspace name exactly to confirm");
    await ctx.db.patch(t._id, { status: "suspended" });
    for (const u of await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", t._id)).collect()) await revokeSessions(ctx, u._id);
    await audit(ctx, { actorId: user._id, action: "platform.workspace_deleted", entityType: "tenants", entityId: t._id, metadata: { name: t.name, slug: t.slug } });
    await ctx.scheduler.runAfter(0, internal.maintenance.wipeTenant, { tenantId: t._id });
    return { scheduled: true };
  },
});

/* ------------------------------ platform-wide audit ------------------------------ */

export const auditAll = query({
  args: { tenantId: v.optional(v.id("tenants")), action: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Platform-wide, so platform administrators only. ("audit:read" is also held by every workspace admin,
    // for their own workspace, and would leak every other campaign's activity.)
    await authorize(ctx, "tenants:manage");
    const limit = Math.min(args.limit ?? 150, 400);
    const base = args.tenantId
      ? ctx.db.query("audit_log").withIndex("by_tenant_time", (q) => q.eq("tenantId", args.tenantId))
      : ctx.db.query("audit_log").withIndex("by_time");
    const rows = (await base.order("desc").take(args.action ? 1500 : limit)).filter((r) => !args.action || r.action.startsWith(args.action)).slice(0, limit);
    const n = await names(ctx, rows.map((r) => r.actorId), rows.map((r) => r.tenantId));
    return rows.map((r) => ({ id: r._id, action: r.action, actor: n.user(r.actorId), workspace: n.tenant(r.tenantId), metadata: r.metadata ?? null, createdAt: r.createdAt }));
  },
});

/* ------------------------------ platform settings ------------------------------ */

export const settings = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "tenants:manage");
    const s = await ctx.db.query("platform_settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    return { signupsOpen: s?.signupsOpen ?? true };
  },
});

export const setSignupsOpen = mutation({
  args: { open: v.boolean() },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "tenants:manage");
    const s = await ctx.db.query("platform_settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    if (s) await ctx.db.patch(s._id, { signupsOpen: args.open, updatedBy: user._id, updatedAt: Date.now() });
    else await ctx.db.insert("platform_settings", { key: "main", signupsOpen: args.open, updatedBy: user._id, updatedAt: Date.now() });
    await audit(ctx, { actorId: user._id, action: args.open ? "platform.signups_opened" : "platform.signups_closed", entityType: "platform_settings", entityId: "main" });
  },
});
