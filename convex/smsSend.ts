import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { audit } from "./lib/audit";
import { bump } from "./contacts";
import { isInsideSendWindow } from "./lib/sms";
import { normalizeKenyanPhone } from "./lib/phone";

/**
 * Sends approved messages through Africa's Talking, and records only what the network reports.
 * Nothing here pretends a message was delivered: "accepted" means the network took it,
 * "delivered" is set only by a delivery report from the handset's network.
 *
 * Needs, in the Convex environment: AT_USERNAME, AT_API_KEY, and (for the callbacks) AT_CALLBACK_SECRET.
 * AT_USERNAME=sandbox with an AT_BASE_URL of https://api.sandbox.africastalking.com tries it without sending real SMS.
 */

const PAGE = 200; // recipients per request
const MAX_PAGES_PER_RUN = 25;
const STALE_MS = 15 * 60 * 1000;

function config() {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return null;
  return { username, apiKey, base: (process.env.AT_BASE_URL || "https://api.africastalking.com").replace(/\/$/, "") };
}

/** Africa's Talking per-recipient codes: 100 processed, 101 sent, 102 queued. Everything else is a refusal. */
const ACCEPTED = new Set([100, 101, 102]);

/* ---------------------------------- state ---------------------------------- */

export const due = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const ready = await ctx.db.query("sms_messages").withIndex("by_status", (q) => q.eq("status", "approved").lte("scheduledFor", now)).take(5);
    const stuck = await ctx.db.query("sms_messages").withIndex("by_status", (q) => q.eq("status", "sending")).take(20);
    return [...ready, ...stuck.filter((m) => (m.sendingSince ?? 0) < now - STALE_MS)].map((m) => m._id);
  },
});

export const claim = internalMutation({
  args: { messageId: v.id("sms_messages") },
  handler: async (ctx, { messageId }) => {
    const m = await ctx.db.get(messageId);
    if (!m) return null;
    const now = Date.now();
    const ok = (m.status === "approved" && m.scheduledFor <= now) || (m.status === "sending" && (m.sendingSince ?? 0) < now - STALE_MS);
    if (!ok) return null;
    const tenant = await ctx.db.get(m.tenantId);
    if (!tenant || tenant.status === "suspended") {
      await ctx.db.patch(m._id, { status: "failed", failureNote: "The workspace is suspended", sendingSince: undefined });
      return null;
    }
    await ctx.db.patch(m._id, { status: "sending", sendingSince: now });
    return { body: m.body, tenantId: m.tenantId, group: m.targetGroup ?? null, cursor: m.cursor ?? null, segments: m.segments, senderId: tenant.senderId ?? null };
  },
});

export const page = internalQuery({
  args: { tenantId: v.id("tenants"), group: v.union(v.string(), v.null()), cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { tenantId, group, cursor }) => {
    const q = group
      ? ctx.db.query("contacts").withIndex("by_tenant_group", (x) => x.eq("tenantId", tenantId).eq("group", group))
      : ctx.db.query("contacts").withIndex("by_tenant", (x) => x.eq("tenantId", tenantId));
    const res = await q.paginate({ numItems: PAGE, cursor });
    return { phones: res.page.filter((c) => c.consentStatus === "opted_in").map((c) => c.phone), cursor: res.continueCursor, isDone: res.isDone };
  },
});

/** Takes the credit for one batch up front. False means the balance cannot cover it. */
export const reserve = internalMutation({
  args: { tenantId: v.id("tenants"), amount: v.number() },
  handler: async (ctx, { tenantId, amount }) => {
    const t = await ctx.db.get(tenantId);
    const balance = t?.smsCredits ?? 0;
    if (!t || balance < amount) return false;
    await ctx.db.patch(tenantId, { smsCredits: balance - amount });
    return true;
  },
});

export const record = internalMutation({
  args: {
    messageId: v.id("sms_messages"),
    tenantId: v.id("tenants"),
    segments: v.number(),
    reserved: v.number(),
    cursor: v.string(),
    results: v.array(v.object({ phone: v.string(), ok: v.boolean(), providerId: v.optional(v.string()), reason: v.optional(v.string()) })),
  },
  handler: async (ctx, a) => {
    let accepted = 0, rejected = 0;
    for (const r of a.results) {
      await ctx.db.insert("sms_recipients", {
        messageId: a.messageId, tenantId: a.tenantId, phone: r.phone, providerId: r.providerId,
        status: r.ok ? "accepted" : "failed", reason: r.reason,
      });
      if (r.ok) accepted++; else rejected++;
    }
    const m = await ctx.db.get(a.messageId);
    if (m) await ctx.db.patch(m._id, { cursor: a.cursor, sendingSince: Date.now(), accepted: (m.accepted ?? 0) + accepted, rejected: (m.rejected ?? 0) + rejected });
    // Give back the credit for anyone the network refused.
    const refund = Math.max(0, a.reserved - accepted * a.segments);
    if (refund > 0) {
      const t = await ctx.db.get(a.tenantId);
      if (t) await ctx.db.patch(t._id, { smsCredits: (t.smsCredits ?? 0) + refund });
    }
  },
});

export const refund = internalMutation({
  args: { tenantId: v.id("tenants"), amount: v.number() },
  handler: async (ctx, { tenantId, amount }) => {
    const t = await ctx.db.get(tenantId);
    if (t) await ctx.db.patch(t._id, { smsCredits: (t.smsCredits ?? 0) + amount });
  },
});

export const release = internalMutation({
  args: { messageId: v.id("sms_messages") },
  handler: async (ctx, { messageId }) => {
    const m = await ctx.db.get(messageId);
    if (m && m.status === "sending") await ctx.db.patch(m._id, { status: "approved", sendingSince: undefined });
  },
});

export const finish = internalMutation({
  args: { messageId: v.id("sms_messages"), status: v.union(v.literal("sent"), v.literal("failed")), note: v.optional(v.string()) },
  handler: async (ctx, { messageId, status, note }) => {
    const m = await ctx.db.get(messageId);
    if (!m) return;
    await ctx.db.patch(m._id, { status, failureNote: note, sendingSince: undefined });
    await audit(ctx, { tenantId: m.tenantId, action: `message.${status}`, entityType: "sms_messages", entityId: m._id, metadata: { accepted: m.accepted ?? 0, rejected: m.rejected ?? 0, note } });
  },
});

/* ---------------------------------- sending ---------------------------------- */

type Claimed = { body: string; tenantId: Id<"tenants">; group: string | null; cursor: string | null; segments: number; senderId: string | null };
type Page = { phones: string[]; cursor: string; isDone: boolean };
type AtRecipient = { statusCode: number; number: string; status: string; messageId?: string };

async function deliver(cfg: NonNullable<ReturnType<typeof config>>, phones: string[], body: string, senderId: string | null) {
  const form = new URLSearchParams({ username: cfg.username, to: phones.join(","), message: body });
  if (senderId) form.set("from", senderId);
  const res = await fetch(`${cfg.base}/version1/messaging`, {
    method: "POST",
    headers: { apiKey: cfg.apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!res.ok) throw new Error(`Africa's Talking answered ${res.status}`);
  const json = (await res.json()) as { SMSMessageData?: { Recipients?: AtRecipient[] } };
  return json.SMSMessageData?.Recipients ?? [];
}

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<{ skipped?: string; handled?: number }> => {
    const cfg = config();
    if (!cfg) return { skipped: "Africa's Talking is not configured" };
    if (!isInsideSendWindow(Date.now())) return { skipped: "outside 08:00-17:00 EAT" };
    const ids: Id<"sms_messages">[] = await ctx.runQuery(internal.smsSend.due, { now: Date.now() });
    for (const id of ids) await sendOne(ctx, cfg, id);
    return { handled: ids.length };
  },
});

async function sendOne(ctx: import("./_generated/server").ActionCtx, cfg: NonNullable<ReturnType<typeof config>>, messageId: Id<"sms_messages">) {
  const m: Claimed | null = await ctx.runMutation(internal.smsSend.claim, { messageId });
  if (!m) return;
  let cursor = m.cursor;
  for (let i = 0; i < MAX_PAGES_PER_RUN; i++) {
    if (!isInsideSendWindow(Date.now())) return void (await ctx.runMutation(internal.smsSend.release, { messageId }));
    const pg: Page = await ctx.runQuery(internal.smsSend.page, { tenantId: m.tenantId, group: m.group, cursor });
    if (pg.phones.length > 0) {
      const cost = pg.phones.length * m.segments;
      if (!(await ctx.runMutation(internal.smsSend.reserve, { tenantId: m.tenantId, amount: cost }))) {
        return void (await ctx.runMutation(internal.smsSend.finish, { messageId, status: "failed", note: "Not enough SMS credit to finish sending. Ask the platform for more credit." }));
      }
      let rows: AtRecipient[];
      try {
        rows = await deliver(cfg, pg.phones, m.body, m.senderId);
      } catch (e) {
        // We cannot tell whether the network took them, so do not retry (that could message people twice).
        await ctx.runMutation(internal.smsSend.refund, { tenantId: m.tenantId, amount: cost });
        return void (await ctx.runMutation(internal.smsSend.finish, { messageId, status: "failed", note: `${(e as Error).message}. Check the Africa's Talking dashboard before sending again.` }));
      }
      const byPhone = new Map(rows.map((r) => [r.number, r]));
      const results = pg.phones.map((phone: string) => {
        const r = byPhone.get(phone);
        if (!r) return { phone, ok: false, reason: "No answer from the network for this number" };
        return ACCEPTED.has(r.statusCode) ? { phone, ok: true, providerId: r.messageId } : { phone, ok: false, providerId: r.messageId, reason: r.status };
      });
      await ctx.runMutation(internal.smsSend.record, { messageId, tenantId: m.tenantId, segments: m.segments, reserved: cost, cursor: pg.cursor, results });
    }
    cursor = pg.cursor;
    if (pg.isDone) return void (await ctx.runMutation(internal.smsSend.finish, { messageId, status: "sent" }));
  }
  await ctx.runMutation(internal.smsSend.release, { messageId }); // long list: carry on at the next run
}

/* ---------------------------------- callbacks ---------------------------------- */

/** Delivery report from the network. */
export const deliveryReport = internalMutation({
  args: { id: v.string(), status: v.string(), failureReason: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const r = await ctx.db.query("sms_recipients").withIndex("by_provider_id", (q) => q.eq("providerId", a.id)).first();
    if (!r) return;
    const s = a.status.toLowerCase();
    const next = s === "success" ? "delivered" : s === "failed" || s === "rejected" ? "failed" : null;
    if (!next || r.status === next) return;
    const m = await ctx.db.get(r.messageId);
    await ctx.db.patch(r._id, { status: next, reason: next === "failed" ? a.failureReason || a.status : undefined });
    if (!m) return;
    if (next === "delivered") await ctx.db.patch(m._id, { delivered: (m.delivered ?? 0) + 1 });
    else await ctx.db.patch(m._id, { accepted: Math.max(0, (m.accepted ?? 0) - 1), rejected: (m.rejected ?? 0) + 1, delivered: r.status === "delivered" ? Math.max(0, (m.delivered ?? 0) - 1) : m.delivered });
  },
});

const STOP_WORDS = new Set(["STOP", "UNSUBSCRIBE", "ACHA", "END", "QUIT", "CANCEL"]);

/** A reply to the sending number. A stop word withdraws consent in every workspace that holds that number. */
export const incomingReply = internalMutation({
  args: { from: v.string(), text: v.string() },
  handler: async (ctx, a) => {
    if (!STOP_WORDS.has(a.text.trim().toUpperCase().replace(/[^A-Z]/g, ""))) return { optedOut: 0 };
    const phone = normalizeKenyanPhone(a.from);
    if (!phone) return { optedOut: 0 };
    let n = 0;
    for (const c of await ctx.db.query("contacts").withIndex("by_phone", (q) => q.eq("phone", phone)).take(50)) {
      if (c.consentStatus !== "opted_in") continue;
      await ctx.db.patch(c._id, { consentStatus: "opted_out", consentAt: Date.now() });
      await bump(ctx, c.tenantId, { optedIn: -1, group: c.group, groupDelta: -1 });
      await audit(ctx, { tenantId: c.tenantId, action: "contacts.opted_out_by_reply", entityType: "contacts", entityId: c._id });
      n++;
    }
    return { optedOut: n };
  },
});
