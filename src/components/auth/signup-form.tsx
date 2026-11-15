"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Input, PasswordInput } from "@/components/ui/primitives";

export function SignupForm() {
  const [f, setF] = useState({ name: "", campaignName: "", email: "", password: "", confirm: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (f.password !== f.confirm) return setError("The two passwords do not match");
    if (!accepted) return setError("Please accept the Terms, Privacy Policy and Acceptable Use Policy to continue");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, campaignName: f.campaignName, email: f.email, password: f.password, acceptedTerms: accepted }),
      });
      const data = (await res.json()) as { redirect?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create your account");
        setBusy(false);
        return;
      }
      window.location.assign(data.redirect ?? "/app/campaign");
    } catch {
      setError("Network error. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {error && (
        <div role="alert" className="border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}
      <Field label="Your full name" htmlFor="su-name">
        <Input id="su-name" autoComplete="name" required value={f.name} onChange={set("name")} />
      </Field>
      <Field label="Campaign name" htmlFor="su-campaign" hint="For example: Asha Otieno for Embakasi South">
        <Input id="su-campaign" required value={f.campaignName} onChange={set("campaignName")} />
      </Field>
      <Field label="Email address" htmlFor="su-email">
        <Input id="su-email" type="email" autoComplete="email" required value={f.email} onChange={set("email")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" htmlFor="su-pass" hint="6+ characters, upper and lower case, and a number.">
          <PasswordInput id="su-pass" autoComplete="new-password" required value={f.password} onChange={set("password")} />
        </Field>
        <Field label="Confirm password" htmlFor="su-confirm">
          <PasswordInput id="su-confirm" autoComplete="new-password" required value={f.confirm} onChange={set("confirm")} />
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />
        <span>
          I accept the{" "}
          <Link href="/legal/terms" target="_blank" className="font-medium underline underline-offset-4">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/legal/privacy" target="_blank" className="font-medium underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/acceptable-use" target="_blank" className="font-medium underline underline-offset-4">
            Acceptable Use and Messaging Policy
          </Link>
          , and I understand this is independent software, not the IEBC.
        </span>
      </label>
      <Button type="submit" loading={busy} className="h-12 w-full text-base">
        Create my campaign account
      </Button>
    </form>
  );
}
