import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  normalizePhone,
  requireTenantAccess,
  sanitizeCsvField,
  writeAuditLog,
} from "./utils";

function matchSegment(
  voter: {
    ward?: string;
    tags: string[];
    optedOut: boolean;
    deletedAt?: number;
  },
  filter: { wards?: string[]; tags?: string[]; tagLogic?: "and" | "or" }
) {
  if (voter.deletedAt || voter.optedOut) return false;
  if (filter.wards?.length && (!voter.ward || !filter.wards.includes(voter.ward))) {
    return false;
  }
  if (filter.tags?.length) {
    const logic = filter.tagLogic ?? "or";
    if (logic === "and") {
      if (!filter.tags.every((t) => voter.tags.includes(t))) return false;
    } else {
      if (!filter.tags.some((t) => voter.tags.includes(t))) return false;
    }
  }
  return true;
}

export const importContacts = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    fileName: v.string(),
    contacts: v.array(
      v.object({
        fullName: v.string(),
        phone: v.string(),
        ward: v.optional(v.string()),
        pollingStation: v.optional(v.string()),
        constituency: v.optional(v.string()),
        tags: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    const now = Date.now();

    const batchId = await ctx.db.insert("import_batches", {
      tenantId: args.tenantId,
      fileName: args.fileName,
      rowCount: args.contacts.length,
      errorCount: 0,
      status: "processing",
      uploadedBy: user._id,
      createdAt: now,
    });

    let successCount = 0;
    let errorCount = 0;

    for (const raw of args.contacts) {
      try {
        const normalizedPhone = normalizePhone(raw.phone);
        const existing = await ctx.db
          .query("voters")
          .withIndex("by_phone", (q) =>
            q.eq("tenantId", args.tenantId).eq("phone", normalizedPhone)
          )
          .first();

        if (existing && !existing.deletedAt) {
          const mergedTags = Array.from(new Set([...existing.tags, ...raw.tags]));
          await ctx.db.patch(existing._id, { tags: mergedTags, importBatchId: batchId });
        } else if (existing?.deletedAt) {
          await ctx.db.patch(existing._id, {
            fullName: sanitizeCsvField(raw.fullName) || "Unknown",
            ward: sanitizeCsvField(raw.ward),
            pollingStation: sanitizeCsvField(raw.pollingStation),
            constituency: sanitizeCsvField(raw.constituency),
            tags: raw.tags,
            optedOut: false,
            importBatchId: batchId,
            deletedAt: undefined,
          });
        } else {
          await ctx.db.insert("voters", {
            tenantId: args.tenantId,
            fullName: sanitizeCsvField(raw.fullName) || "Unknown",
            phone: normalizedPhone,
            ward: sanitizeCsvField(raw.ward),
            pollingStation: sanitizeCsvField(raw.pollingStation),
            constituency: sanitizeCsvField(raw.constituency),
            tags: raw.tags,
            optedOut: false,
            importBatchId: batchId,
            createdAt: now,
          });
        }
        successCount++;
      } catch {
        errorCount++;
      }
    }

    await ctx.db.patch(batchId, { status: "completed", errorCount });
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "contacts.imported",
      entityType: "import_batches",
      entityId: batchId,
      metadata: { successCount, errorCount, fileName: args.fileName },
    });

    return { batchId, successCount, errorCount };
  },
});

export const rollbackImport = mutation({
  args: { token: v.string(), tenantId: v.id("tenants"), batchId: v.id("import_batches") },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    const voters = await ctx.db
      .query("voters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const now = Date.now();
    let count = 0;
    for (const voter of voters) {
      if (voter.importBatchId === args.batchId && !voter.deletedAt) {
        await ctx.db.patch(voter._id, { deletedAt: now });
        count++;
      }
    }

    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "contacts.import_rolled_back",
      entityType: "import_batches",
      entityId: args.batchId,
      metadata: { count },
    });

    return { count };
  },
});

export const listVoters = query({
  args: {
    token: v.optional(v.string()),
    tenantId: v.id("tenants"),
    wards: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    tagLogic: v.optional(v.union(v.literal("and"), v.literal("or"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    const all = await ctx.db
      .query("voters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const filter = {
      wards: args.wards,
      tags: args.tags,
      tagLogic: args.tagLogic,
    };
    const matched = all.filter((v) => matchSegment(v, filter));
    const limit = args.limit ?? 100;
    return {
      total: matched.length,
      voters: matched.slice(0, limit).map((v) => ({
        id: v._id,
        fullName: v.fullName,
        phone: v.phone,
        ward: v.ward,
        tags: v.tags,
      })),
    };
  },
});

export const getFilterMeta = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    const voters = await ctx.db
      .query("voters")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    const active = voters.filter((v) => !v.deletedAt);
    const wards = [...new Set(active.map((v) => v.ward).filter(Boolean))] as string[];
    const tags = [...new Set(active.flatMap((v) => v.tags))];
    return {
      totalContacts: active.length,
      optedOut: active.filter((v) => v.optedOut).length,
      wards: wards.sort(),
      tags: tags.sort(),
    };
  },
});

export const listImports = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.db
      .query("import_batches")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

export const saveSegment = mutation({
  args: {
    token: v.string(),
    tenantId: v.id("tenants"),
    name: v.string(),
    wards: v.array(v.string()),
    tags: v.array(v.string()),
    tagLogic: v.union(v.literal("and"), v.literal("or")),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx, args.token, args.tenantId);
    const id = await ctx.db.insert("segments", {
      tenantId: args.tenantId,
      name: args.name,
      wards: args.wards,
      tags: args.tags,
      tagLogic: args.tagLogic,
      createdBy: user._id,
      createdAt: Date.now(),
    });
    await writeAuditLog(ctx, {
      tenantId: args.tenantId,
      actorId: user._id,
      action: "segment.saved",
      entityType: "segments",
      entityId: id,
    });
    return id;
  },
});

export const listSegments = query({
  args: { token: v.optional(v.string()), tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.token, args.tenantId);
    return await ctx.db
      .query("segments")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});
