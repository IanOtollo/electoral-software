import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export async function requireSession(ctx: QueryCtx | MutationCtx, token: string | undefined) {
  if (!token) throw new ConvexError("Unauthenticated");

  const session = await ctx.db
    .query("auth_sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session expired");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || user.status === "suspended") {
    throw new ConvexError("Account suspended or not found");
  }

  return user;
}

export async function requirePlatformAdmin(ctx: QueryCtx | MutationCtx, token: string | undefined) {
  const user = await requireSession(ctx, token);
  if (user.role !== "platform_super_admin") {
    throw new ConvexError("Platform admin access required");
  }
  return user;
}

export async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined,
  tenantId: Id<"tenants">
) {
  const user = await requireSession(ctx, token);
  if (user.role === "platform_super_admin") return user;
  if (user.tenantId !== tenantId) {
    throw new ConvexError("Unauthorized access to tenant data");
  }
  return user;
}

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function writeAuditLog(
  ctx: MutationCtx,
  args: {
    tenantId?: Id<"tenants">;
    actorId: Id<"users">;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }
) {
  const lastLog = args.tenantId
    ? await ctx.db
        .query("audit_log")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .order("desc")
        .first()
    : await ctx.db.query("audit_log").order("desc").first();

  const previousHash = lastLog ? lastLog.hash : "genesis_hash";
  const timestamp = Date.now().toString();
  const stringToHash = `${previousHash}${args.actorId}${args.action}${args.entityId}${timestamp}`;
  const hash = await sha256(stringToHash);

  await ctx.db.insert("audit_log", {
    tenantId: args.tenantId,
    actorId: args.actorId,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    previousHash,
    hash,
    metadata: args.metadata,
    createdAt: Date.now(),
  });
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    digits = "254" + digits.substring(1);
  } else if (!digits.startsWith("254") && digits.length === 9) {
    digits = "254" + digits;
  }
  return "+" + digits;
}

export function sanitizeCsvField(str?: string) {
  if (!str) return str;
  if (/^[=+\-@]/.test(str)) return "'" + str;
  return str;
}

export function renderMessageTemplate(
  template: string,
  voter: { fullName: string; ward?: string }
) {
  const stopSuffix = "\n\nReply STOP to opt out.";
  let body = template
    .replace(/\{\{fullName\}\}/g, voter.fullName)
    .replace(/\{\{ward\}\}/g, voter.ward ?? "");
  if (!body.toLowerCase().includes("stop")) {
    body += stopSuffix;
  }
  return body;
}
