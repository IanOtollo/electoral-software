"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge, Button, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { errorMessage } from "@/hooks/use-me";

export default function SettingsPage() {
  const s = useQuery(api.admin.settings);
  const setOpen = useMutation(api.admin.setSignupsOpen);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle(open: boolean) {
    setBusy(true); setError("");
    try {
      await setOpen({ open });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader kicker="Platform" title="Settings" description="Switches that apply to the whole platform, and your own account." />
      {error && <div role="alert" className="mb-6 border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

      <section className="mb-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">New campaign sign-ups</h2>
        <Card className="flex flex-wrap items-center justify-between gap-5 p-5">
          <div className="max-w-xl">
            {s === undefined ? <Skeleton className="h-10 w-64" /> : (
              <>
                <p className="flex items-center gap-3 font-medium">
                  Sign-ups are {s.signupsOpen ? "open" : "paused"} <Badge tone={s.signupsOpen ? "success" : "warning"}>{s.signupsOpen ? "Open" : "Paused"}</Badge>
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  When paused, nobody can create a new campaign account. Existing accounts are not affected. Use this if you are being flooded with fake sign-ups.
                </p>
              </>
            )}
          </div>
          {s !== undefined && (
            <Button variant={s.signupsOpen ? "secondary" : "primary"} loading={busy} onClick={() => toggle(!s.signupsOpen)}>
              {s.signupsOpen ? "Pause sign-ups" : "Open sign-ups"}
            </Button>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your password</h2>
        <Card className="p-6">
          <ChangePasswordForm minLength={8} />
        </Card>
      </section>
    </>
  );
}
