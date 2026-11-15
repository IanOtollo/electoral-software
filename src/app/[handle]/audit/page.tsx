"use client";

import { useQuery } from "convex/react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { useMe } from "@/hooks/use-me";
import { describeAction } from "@/lib/audit-labels";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "medium" });

export default function AuditPage() {
  const { can } = useMe();
  const allowed = can("audit:read");
  const log = useQuery(api.audit.list, allowed ? { limit: 200 } : "skip");
  const chain = useQuery(api.audit.verifyChain, allowed ? {} : "skip");

  if (!allowed) return <EmptyState title="You do not have access to the audit log" />;

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent, tamper-evident record of who did what. Entries cannot be edited or removed."
        actions={
          chain &&
          (chain.valid ? (
            <Badge tone="success">
              <ShieldCheck className="mr-1 size-3.5" /> Chain verified · {chain.entries} entries
            </Badge>
          ) : (
            <Badge tone="danger">
              <ShieldAlert className="mr-1 size-3.5" /> Integrity check failed
            </Badge>
          ))
        }
      />
      <Card className="overflow-hidden">
        {log === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : log.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ul className="divide-y divide-line">
            {log.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{describeAction(e.action, e.metadata)}</p>
                  <p className="text-sm text-muted">{e.actor}</p>
                </div>
                <time className="tnum text-sm text-muted" dateTime={new Date(e.createdAt).toISOString()}>
                  {dateFmt.format(e.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
