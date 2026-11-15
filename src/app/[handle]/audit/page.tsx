"use client";

import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { AuditExplorer } from "@/components/audit/audit-explorer";
import { useMe } from "@/hooks/use-me";

export default function AuditPage() {
  const { can } = useMe();
  if (!can("audit:read")) return <EmptyState title="You do not have access to the audit log" />;
  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent, tamper-evident record of who did what in this workspace: sign-ins, team changes, agents, results, contacts and messages. Entries cannot be edited or removed. Open an entry for the full detail."
      />
      <AuditExplorer admin={false} />
    </>
  );
}
