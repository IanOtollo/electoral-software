"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Logo } from "@/components/layout/logo";
import { Button, Field, Input, PasswordInput, Skeleton } from "@/components/ui/primitives";
import { errorMessage } from "@/hooks/use-me";
import { ROLE_LABELS, type Role } from "../../../../convex/lib/permissions";

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const invite = useQuery(api.users.previewInvite, { token });
  const accept = useMutation(api.users.acceptInvite);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("The two passwords do not match");
    setBusy(true);
    try {
      const { email } = await accept({ token, name, password });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { redirect?: string };
      window.location.assign(res.ok ? (data.redirect ?? "/app") : "/login");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo />
        </div>

        {invite === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : invite === null ? (
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invitation not valid</h1>
            <p className="mt-2 text-sm text-muted">
              This link has expired, was already used, or was withdrawn. Ask your administrator to send a new one.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Join {invite.workspace}</h1>
            <p className="mb-8 mt-1 text-sm text-muted">
              You have been invited as <span className="font-medium text-ink">{ROLE_LABELS[invite.role as Role]}</span> using{" "}
              <span className="font-medium text-ink">{invite.email}</span>.
            </p>
            <form onSubmit={submit} className="space-y-5" noValidate>
              {error && (
                <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  {error}
                </div>
              )}
              <Field label="Full name" htmlFor="name">
                <Input id="name" autoComplete="name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Password" htmlFor="password" hint="At least 6 characters with upper-case, lower-case and a number.">
                <PasswordInput id="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
              <Field label="Confirm password" htmlFor="confirm">
                <PasswordInput id="confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
              <Button type="submit" loading={busy} className="w-full">
                Create account
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
