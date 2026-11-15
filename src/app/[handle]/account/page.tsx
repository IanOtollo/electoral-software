"use client";

import { Card, PageHeader } from "@/components/ui/primitives";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { useMe } from "@/hooks/use-me";
import { ROLE_LABELS, type Role } from "../../../../convex/lib/permissions";

export default function AccountPage() {
  const { me } = useMe();
  return (
    <>
      <PageHeader kicker="You" title="Your account" description="Your sign-in details and password." />
      {me && (
        <Card className="mb-10 max-w-md p-5">
          <p className="font-semibold">{me.name}</p>
          <p className="text-muted">{me.email}</p>
          <p className="mt-2 text-sm text-muted">{ROLE_LABELS[me.role as Role]}{me.tenant ? ` · ${me.tenant.name}` : ""}</p>
        </Card>
      )}
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Change your password</h2>
      <ChangePasswordForm minLength={6} />
      <p className="mt-6 max-w-md text-sm text-muted">If you forget your password, ask the person who runs the platform to send you a reset link. Changing it here signs you out of every other device.</p>
    </>
  );
}
