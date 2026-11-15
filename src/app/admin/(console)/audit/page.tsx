"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
import { AUDIT_GROUPS, describeAction } from "@/lib/audit-labels";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "medium" });

export default function PlatformAuditPage() {
  const workspaces = useQuery(api.admin.workspaces);
  const [workspace, setWorkspace] = useState("");
  const [group, setGroup] = useState("");
  const rows = useQuery(api.admin.auditAll, { tenantId: workspace ? (workspace as Id<"tenants">) : undefined, action: group || undefined, limit: 200 });

  return (
    <>
      <PageHeader
        kicker="Platform"
        title="Audit log"
        description="A permanent, tamper-evident record of important actions across every workspace. Entries cannot be edited or removed. Verify a single workspace's chain from its own page."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_16rem]">
        <Combobox aria-label="Filter by workspace" value={workspace} onChange={(e) => setWorkspace(e.target.value)}>
          <option value="">All workspaces</option>
          {(workspaces ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </Combobox>
        <Select aria-label="Filter by kind of action" value={group} onChange={(e) => setGroup(e.target.value)}>
          {AUDIT_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {rows === undefined ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : rows.length === 0 ? (
          <EmptyState title="No matching activity" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 px-5 py-3.5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">{describeAction(r.action, r.metadata)}</p>
                  <p className="text-sm text-muted">{r.actor} · {r.workspace}</p>
                </div>
                <time className="tnum text-sm text-muted" dateTime={new Date(r.createdAt).toISOString()}>{when.format(r.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {rows && rows.length >= 200 && <p className="mt-3 text-sm text-muted">Showing the most recent 200 entries. Narrow the filters to look further back.</p>}
    </>
  );
}
