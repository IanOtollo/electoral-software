"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, Input, PasswordInput } from "@/components/ui/primitives";

/**
 * Shared by the campaign sign-in and the separate admin sign-in. `scope` is sent
 * to the server, which refuses a mismatch (an admin cannot use the campaign form,
 * and a campaign user cannot use the admin form).
 */
export function LoginForm({ scope, home, next: nextProp, autoFocus = true }: { scope: "campaign" | "admin"; home: string; next?: string; autoFocus?: boolean }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, scope }),
      });
      const data = (await res.json()) as { redirect?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to sign in");
        setBusy(false);
        return;
      }
      // Only same-site relative paths inside this area, never an open redirect.
      const next = nextProp ?? params.get("next");
      const inArea = !!next && next.startsWith("/") && !next.startsWith("//") && (scope === "admin" ? next.startsWith("/admin") : !next.startsWith("/admin"));
      const safe = inArea ? next : data.redirect;
      window.location.assign(safe ?? home);
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}
      <Field label="Email address" htmlFor="email">
        <Input id="email" type="email" autoComplete="username" required autoFocus={autoFocus} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" loading={busy} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
