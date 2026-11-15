import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertServer, hashPassword, randomToken, sha256Hex, validatePasswordStrength } from "./lib/crypto";
import { audit } from "./lib/audit";
import { TERMS_VERSION } from "./lib/legal";
import { handleFromName, isReservedHandle } from "./lib/reserved";

const SESSION_TTL = 1000 * 60 * 60 * 12;
const SIGNUPS_PER_HOUR = 5;

/**
 * Self-service sign-up for aspirants. Server-only (called from /api/auth/signup so
 * the client IP can be rate limited). Returns a session like a normal sign-in.
 * Returns a result instead of throwing so the rate-limit counter is committed.
 */
export const register = mutation({
  args: {
    serverSecret: v.string(),
    ip: v.string(),
    userAgent: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    campaignName: v.string(),
    acceptedTerms: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertServer(args.serverSecret);
    const now = Date.now();

    // The administrator can pause new sign-ups platform-wide.
    const setting = await ctx.db.query("platform_settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    if (setting && !setting.signupsOpen) return { ok: false as const, message: "New campaign sign-ups are paused at the moment. Please check back soon." };

    const key = "signup:" + (await sha256Hex(args.ip));
    const rl = await ctx.db.query("rate_limits").withIndex("by_key", (q) => q.eq("key", key)).unique();
    if (rl && now - rl.windowStart < 3600_000 && rl.count >= SIGNUPS_PER_HOUR) {
      return { ok: false as const, message: "Too many sign-ups from this network. Please try again later." };
    }

    const name = args.name.trim();
    const email = args.email.toLowerCase().trim();
    const campaignName = args.campaignName.trim();
    const problem =
      name.length < 2 ? "Enter your full name" :
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? "Enter a valid email address" :
      campaignName.length < 3 ? "Enter your campaign name" :
      !args.acceptedTerms ? "You must accept the Terms, Privacy Policy and Acceptable Use Policy" :
      validatePasswordStrength(args.password);
    if (problem) return { ok: false as const, message: problem };

    if (await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).unique()) {
      return { ok: false as const, message: "An account with this email already exists" };
    }

    if (rl && now - rl.windowStart < 3600_000) await ctx.db.patch(rl._id, { count: rl.count + 1 });
    else if (rl) await ctx.db.patch(rl._id, { count: 1, windowStart: now });
    else await ctx.db.insert("rate_limits", { key, count: 1, windowStart: now });

    // The workspace address is the aspirant's own name: /asha-otieno. A second Asha Otieno becomes /asha-otieno-2,
    // and system words (admin, login, area...) can never be taken.
    const base = handleFromName(name);
    let slug = base;
    for (let n = 2; ; n++) {
      const taken = isReservedHandle(slug) || (await ctx.db.query("tenants").withIndex("by_slug", (q) => q.eq("slug", slug)).unique());
      if (!taken) break;
      if (n > 500) return { ok: false as const, message: "Could not create a workspace address. Please try a different name." };
      slug = `${base}-${n}`;
    }

    const tenantId = await ctx.db.insert("tenants", {
      name: campaignName,
      slug,
      status: "active",
      plan: "starter",
      modules: ["tally", "sms"],
      contactEmail: email,
      smsCredits: 0,
      createdAt: now,
    });
    const userId = await ctx.db.insert("users", {
      tenantId,
      email,
      name,
      role: "tenant_admin",
      status: "active",
      passwordHash: await hashPassword(args.password),
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: now,
      createdAt: now,
    });
    const sid = randomToken(24);
    const expiresAt = now + SESSION_TTL;
    await ctx.db.insert("sessions", { sid, userId, expiresAt, userAgent: args.userAgent, createdAt: now });
    await ctx.db.patch(userId, { lastLoginAt: now });
    await audit(ctx, { tenantId, actorId: userId, action: "tenant.signed_up", entityType: "tenants", entityId: tenantId, metadata: { campaignName } });
    return { ok: true as const, sid, expiresAt, slug };
  },
});
