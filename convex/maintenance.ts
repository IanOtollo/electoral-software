import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DAY = 24 * 60 * 60 * 1000;
const BATCH = 500;
const WIPE_BATCH = 250;

/**
 * Removes a closed workspace and everything in it, a few hundred rows at a time so a large
 * campaign never hits a transaction limit. It reschedules itself until nothing is left, then
 * deletes the workspace itself. Started by admin.deleteWorkspace, which has already blocked access.
 */
export const wipeTenant = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    let budget = WIPE_BATCH;
    const again = async () => {
      await ctx.scheduler.runAfter(0, internal.maintenance.wipeTenant, { tenantId });
      return { done: false };
    };

    const contacts = await ctx.db.query("contacts").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).take(budget);
    for (const c of contacts) await ctx.db.delete(c._id);
    if ((budget -= contacts.length) <= 0) return await again();

    const subs = await ctx.db.query("submissions").withIndex("by_tenant_current", (q) => q.eq("tenantId", tenantId)).take(budget);
    for (const s of subs) {
      await ctx.storage.delete(s.storageId).catch(() => {});
      await ctx.db.delete(s._id);
    }
    if ((budget -= subs.length) <= 0) return await again();

    const msgs = await ctx.db.query("sms_messages").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).take(budget);
    for (const m of msgs) {
      await ctx.storage.delete(m.authorizationStorageId).catch(() => {});
      await ctx.storage.delete(m.identityStorageId).catch(() => {});
      await ctx.db.delete(m._id);
    }
    if ((budget -= msgs.length) <= 0) return await again();

    for (const table of ["agents", "candidates", "contact_stats", "invites", "sms_recipients"] as const) {
      const rows = await ctx.db.query(table).withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).take(budget);
      for (const r of rows) await ctx.db.delete(r._id);
      if ((budget -= rows.length) <= 0) return await again();
    }

    const users = await ctx.db.query("users").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).take(budget);
    for (const u of users) {
      for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", u._id)).collect()) await ctx.db.delete(s._id);
      for (const p of await ctx.db.query("password_resets").withIndex("by_user", (q) => q.eq("userId", u._id)).collect()) await ctx.db.delete(p._id);
      await ctx.db.delete(u._id);
    }
    if ((budget -= users.length) <= 0) return await again();

    const log = await ctx.db.query("audit_log").withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId)).take(budget);
    for (const l of log) await ctx.db.delete(l._id);
    if ((budget -= log.length) <= 0) return await again();

    if (await ctx.db.get(tenantId)) await ctx.db.delete(tenantId);
    return { done: true };
  },
});

/**
 * Deletes short-lived security records once they are useless, so the retention
 * stated in the Privacy Policy is what the system actually does:
 *   sessions and agent sessions: removed 1 day after they expire
 *   sign-in attempt counters and sign-up rate-limit counters: removed 1 day after their window
 */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - DAY;
    const removed = { sessions: 0, agentSessions: 0, loginAttempts: 0, rateLimits: 0 };

    for (const s of await ctx.db.query("sessions").withIndex("by_expiry", (q) => q.lt("expiresAt", cutoff)).take(BATCH)) {
      await ctx.db.delete(s._id);
      removed.sessions++;
    }
    for (const s of await ctx.db.query("agent_sessions").withIndex("by_expiry", (q) => q.lt("expiresAt", cutoff)).take(BATCH)) {
      await ctx.db.delete(s._id);
      removed.agentSessions++;
    }
    for (const r of await ctx.db.query("login_attempts").withIndex("by_window", (q) => q.lt("windowStart", cutoff)).take(BATCH)) {
      await ctx.db.delete(r._id);
      removed.loginAttempts++;
    }
    for (const r of await ctx.db.query("rate_limits").withIndex("by_window", (q) => q.lt("windowStart", cutoff)).take(BATCH)) {
      await ctx.db.delete(r._id);
      removed.rateLimits++;
    }
    return removed;
  },
});
