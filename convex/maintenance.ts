import { internalMutation } from "./_generated/server";

const DAY = 24 * 60 * 60 * 1000;
const BATCH = 500;

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
