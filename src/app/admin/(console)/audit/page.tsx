"use client";

import { PageHeader } from "@/components/ui/primitives";
import { AuditExplorer } from "@/components/audit/audit-explorer";

export default function PlatformAuditPage() {
  return (
    <>
      <PageHeader
        kicker="Platform"
        title="Audit log"
        description="A permanent, tamper-evident record of what happens on the platform: sign-ins and failures, administrator actions, workspace changes, messages and every result an agent sends. Entries cannot be edited or removed. Open an entry for the full detail."
      />
      <AuditExplorer admin />
    </>
  );
}
