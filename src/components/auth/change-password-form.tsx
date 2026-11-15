"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button, Field, PasswordInput } from "@/components/ui/primitives";
import { errorMessage } from "@/hooks/use-me";

/** Used by aspirants and by the administrator. Changing it ends every other session of the account. */
export function ChangePasswordForm({ minLength }: { minLength: number }) {
  const change = useMutation(api.passwords.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setMsg({ ok: false, text: "The two new passwords do not match" });
    setBusy(true);
    try {
      const r = await change({ current, next });
      setCurrent(""); setNext(""); setConfirm("");
      setMsg({ ok: true, text: r.otherSessionsEnded > 0 ? `Password changed. ${r.otherSessionsEnded} other session${r.otherSessionsEnded === 1 ? " was" : "s were"} signed out.` : "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-5" noValidate>
      {msg && (
        <div role={msg.ok ? "status" : "alert"} className={`border px-3 py-2.5 text-sm ${msg.ok ? "border-success/40 bg-success-soft text-success" : "border-danger/40 bg-danger-soft text-danger"}`}>
          {msg.text}
        </div>
      )}
      <Field label="Current password" htmlFor="cp-current">
        <PasswordInput id="cp-current" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password" htmlFor="cp-new" hint={`At least ${minLength} characters with upper-case, lower-case and a number.`}>
        <PasswordInput id="cp-new" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new password" htmlFor="cp-confirm">
        <PasswordInput id="cp-confirm" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" loading={busy}>Change password</Button>
    </form>
  );
}
