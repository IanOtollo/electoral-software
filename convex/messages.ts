import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { authorize } from "./lib/guard";
import { audit } from "./lib/audit";
import { MIN_LEAD_MS, SEND_WINDOW, eatHour, isInsideSendWindow, segmentsFor } from "./lib/sms";

const fail = (message: string) => new ConvexError({ code: "BAD_REQUEST", message });
const MAX_BODY = 480;
const MAX_FILE = 10 * 1024 * 1024;

async function checkFile(ctx: { db: { system: { get: (id: never) => Promise<unknown> } } }, id: unknown, label: string) {
  const meta = (await ctx.db.system.get(id as never)) as { size: number; contentType?: string } | null;
  if (!meta) throw fail(`The ${label} did not upload. Please try again.`);
  if (meta.size > MAX_FILE) throw fail(`The ${label} is larger than 10 MB`);
  if (!(meta.contentType === "application/pdf" || meta.contentType?.startsWith("image/"))) throw fail(`The ${label} must be a PDF or an image`);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "sms:send");
    return await ctx.storage.generateUploadUrl();
  },
});

/** What the form needs to check a message as the person types: parts per recipient and who it would reach. */
export const preview = query({
  args: { body: v.string(), targetGroup: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { tenantId } = await authorize(ctx, "sms:read");
    if (!tenantId) return { segments: segmentsFor(args.body), recipients: 0, credits: 0 };
    const tenant = await ctx.db.get(tenantId);
    const row = await ctx.db.query("contact_stats").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).unique();
    const recipients = args.targetGroup ? (row?.groups.find((g) => g.name === args.targetGroup)?.count ?? 0) : (row?.optedIn ?? 0);
    return { segments: segmentsFor(args.body), recipients, credits: tenant?.smsCredits ?? 0 };
  },
});

/**
 * Submit a political message for approval. Every rule here comes from the Communications Authority's
 * July 2017 guidelines: at least 48 hours ahead (7.1), bearing the sponsor's name (8.2), English or Kiswahili
 * (8.7), sent only between 08:00 and 17:00 (9.2), to opted-in people only (10.1), with the sponsor's signed
 * authorisation and identification attached (7.1.2, 7.1.3).
 */
export const submit = mutation({
  args: {
    body: v.string(),
    language: v.union(v.literal("en"), v.literal("sw")),
    sponsorName: v.string(),
    targetGroup: v.optional(v.string()),
    scheduledFor: v.number(),
    authorizationStorageId: v.id("_storage"),
    identityStorageId: v.id("_storage"),
    confirmContent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "sms:send");
    if (!tenantId) throw fail("No workspace");
    const tenant = await ctx.db.get(tenantId);
    if (!tenant?.modules.includes("sms")) throw fail("Messaging is not switched on for this account");

    const body = args.body.trim();
    const sponsor = args.sponsorName.trim();
    if (body.length < 5) throw fail("Write the message");
    if (body.length > MAX_BODY) throw fail(`A message can be at most ${MAX_BODY} characters`);
    if (sponsor.length < 3) throw fail("Enter the name of the person or party sponsoring the message");
    if (!body.toLowerCase().includes(sponsor.toLowerCase())) throw fail(`The message must carry the sponsor's name. Include "${sponsor}" in the text.`);
    if (!args.confirmContent) throw fail("Confirm that the message is in English or Kiswahili and contains nothing hateful, threatening, abusive or misleading");

    const now = Date.now();
    if (args.scheduledFor < now + MIN_LEAD_MS) throw fail("Political messages must be submitted at least 48 hours before they are sent");
    if (!isInsideSendWindow(args.scheduledFor)) {
      throw fail(`Political messages may only be sent between ${String(SEND_WINDOW.startHour).padStart(2, "0")}:00 and ${SEND_WINDOW.endHour}:00 East Africa Time. That time is ${String(eatHour(args.scheduledFor)).padStart(2, "0")}:00.`);
    }

    const stats = await ctx.db.query("contact_stats").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).unique();
    const recipients = args.targetGroup ? (stats?.groups.find((g) => g.name === args.targetGroup)?.count ?? 0) : (stats?.optedIn ?? 0);
    if (recipients < 1) throw fail("There is nobody to send this to. Only contacts who have opted in can be messaged.");

    await checkFile(ctx, args.authorizationStorageId, "authorisation letter");
    await checkFile(ctx, args.identityStorageId, "identification document");

    const id = await ctx.db.insert("sms_messages", {
      tenantId, createdBy: user._id, body, language: args.language, sponsorName: sponsor,
      targetGroup: args.targetGroup || undefined, recipients, segments: segmentsFor(body), scheduledFor: args.scheduledFor,
      authorizationStorageId: args.authorizationStorageId, identityStorageId: args.identityStorageId,
      status: "submitted", createdAt: now,
    });
    await audit(ctx, { tenantId, actorId: user._id, action: "message.submitted", entityType: "sms_messages", entityId: id, metadata: { recipients, scheduledFor: args.scheduledFor } });
    return { id };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { tenantId } = await authorize(ctx, "sms:read");
    if (!tenantId) return [];
    const rows = await ctx.db.query("sms_messages").withIndex("by_tenant", (q) => q.eq("tenantId", tenantId)).order("desc").take(100);
    return rows.map((m) => ({
      id: m._id, body: m.body, language: m.language, sponsorName: m.sponsorName, targetGroup: m.targetGroup ?? null,
      recipients: m.recipients, segments: m.segments, scheduledFor: m.scheduledFor, status: m.status,
      reviewNote: m.reviewNote ?? null, createdAt: m.createdAt,
      accepted: m.accepted ?? 0, rejected: m.rejected ?? 0, delivered: m.delivered ?? 0, failureNote: m.failureNote ?? null,
    }));
  },
});

export const cancel = mutation({
  args: { messageId: v.id("sms_messages") },
  handler: async (ctx, args) => {
    const { user, tenantId } = await authorize(ctx, "sms:send");
    const m = await ctx.db.get(args.messageId);
    if (!m || m.tenantId !== tenantId || !tenantId) throw fail("Message not found");
    if (m.status !== "submitted" && m.status !== "approved") throw fail("This message can no longer be cancelled");
    await ctx.db.patch(m._id, { status: "cancelled" });
    await audit(ctx, { tenantId, actorId: user._id, action: "message.cancelled", entityType: "sms_messages", entityId: m._id });
  },
});

/* ---------------- platform review: relay to the licensed provider and record the decision ---------------- */

export const adminQueue = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "sms:review");
    const rows = await ctx.db.query("sms_messages").withIndex("by_status", (q) => q.eq("status", "submitted")).order("asc").take(100);
    return await Promise.all(
      rows.map(async (m) => {
        const t = await ctx.db.get(m.tenantId);
        return {
          id: m._id, workspace: t?.name ?? "Unknown", body: m.body, language: m.language, sponsorName: m.sponsorName,
          targetGroup: m.targetGroup ?? null, recipients: m.recipients, segments: m.segments, scheduledFor: m.scheduledFor, createdAt: m.createdAt,
          authorizationUrl: await ctx.storage.getUrl(m.authorizationStorageId), identityUrl: await ctx.storage.getUrl(m.identityStorageId),
        };
      }),
    );
  },
});

export const adminDecide = mutation({
  args: { messageId: v.id("sms_messages"), decision: v.union(v.literal("approved"), v.literal("refused")), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await authorize(ctx, "sms:review");
    const m = await ctx.db.get(args.messageId);
    if (!m) throw fail("Message not found");
    if (m.status !== "submitted") throw fail("This message has already been decided");
    const note = args.note?.trim();
    if (args.decision === "refused" && (!note || note.length < 5)) throw fail("Give the reason for refusing, so the sponsor can fix it");
    await ctx.db.patch(m._id, { status: args.decision, reviewNote: note || undefined, reviewedBy: user._id, reviewedAt: Date.now() });
    await audit(ctx, { tenantId: m.tenantId, actorId: user._id, action: `message.${args.decision}`, entityType: "sms_messages", entityId: m._id, metadata: { note } });
  },
});

/** Recently decided requests, so the approval queue keeps a visible record. */
export const adminHistory = query({
  args: {},
  handler: async (ctx) => {
    await authorize(ctx, "sms:review");
    const rows = [
      ...(await ctx.db.query("sms_messages").withIndex("by_status", (q) => q.eq("status", "approved")).order("desc").take(50)),
      ...(await ctx.db.query("sms_messages").withIndex("by_status", (q) => q.eq("status", "refused")).order("desc").take(50)),
    ].sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)).slice(0, 60);
    return await Promise.all(
      rows.map(async (m) => {
        const t = await ctx.db.get(m.tenantId);
        return { id: m._id, workspace: t?.name ?? "Deleted workspace", body: m.body, sponsorName: m.sponsorName, recipients: m.recipients, scheduledFor: m.scheduledFor, status: m.status, reviewNote: m.reviewNote ?? null, reviewedAt: m.reviewedAt ?? null };
      }),
    );
  },
});
