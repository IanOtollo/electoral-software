"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Logo } from "@/components/layout/logo";
import { Button, Field, PasswordInput, Skeleton } from "@/components/ui/primitives";
import { errorMessage } from "@/hooks/use-me";

export default function ResetPage() {
  const { token } = useParams<{ token: string }>();
  const preview = useQuery(api.passwords.previewReset, { token });
  const reset = useMutation(api.passwords.resetPassword);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("The two passwords do not match");
    setBusy(true);
    try {
      await reset({ token, password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-var(--banner-h))] items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Logo /></div>
        {preview === undefined ? (
          <div className="space-y-3"><Skeleton className="h-8 w-56" /><Skeleton className="h-40" /></div>
        ) : done ? (
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Password changed</h1>
            <p className="text-muted">You have been signed out everywhere. Sign in again with your new password.</p>
            <Link href="/aspirant?mode=signin" className="inline-flex h-11 items-center bg-primary px-6 font-medium text-primary-foreground hover:bg-primary-hover">Go to sign in</Link>
          </div>
        ) : preview === null ? (
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Link not valid</h1>
            <p className="mt-2 text-muted">This reset link has expired, was already used, or was withdrawn. Ask your administrator for a new one.</p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Choose a new password</h1>
            <p className="mb-8 mt-2 text-muted">For <span className="font-medium text-ink">{preview.email}</span>.</p>
            <form onSubmit={submit} className="space-y-5" noValidate>
              {error && <div role="alert" className="border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}
              <Field label="New password" htmlFor="rp-new" hint="At least 6 characters (8 for administrators) with upper-case, lower-case and a number.">
                <PasswordInput id="rp-new" autoComplete="new-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Confirm new password" htmlFor="rp-confirm">
                <PasswordInput id="rp-confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
              <Button type="submit" loading={busy} className="w-full">Save new password</Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
