"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Upload } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { errorMessage, useMe } from "@/hooks/use-me";
import { parseContacts } from "@/lib/contacts-parse";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const BATCH = 500;

export default function ContactsPage() {
  const { can } = useMe();
  const stats = useQuery(api.contacts.stats, can("voters:read") ? {} : "skip");
  const [group, setGroup] = useState("");
  const rows = useQuery(api.contacts.recent, can("voters:read") ? { group: group || undefined } : "skip");
  const optOut = useMutation(api.contacts.optOut);
  const remove = useMutation(api.contacts.remove);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  if (!can("voters:read")) return <EmptyState title="You do not have access to contacts" />;
  const write = can("voters:write");

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const needle = filter.trim().toLowerCase();
  const shown = (rows ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.phone.includes(needle.replace(/^0/, "+254")));

  return (
    <>
      <PageHeader
        kicker="Voter messaging"
        title="Contacts"
        description="People who have agreed to hear from you. Only people marked as opted in can ever be messaged."
        actions={write && <Button onClick={() => setImporting(true)}><Upload className="size-4" /> Add contacts</Button>}
      />

      {error && <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}

      <div className="mb-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        {[
          ["On file", stats?.total],
          ["Opted in", stats?.optedIn],
          ["Opted out", stats ? stats.total - stats.optedIn : undefined],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
            {value === undefined ? <Skeleton className="mt-2 h-9 w-20" /> : <p className="mt-1 text-3xl font-semibold tabular-nums">{(value as number).toLocaleString("en-KE")}</p>}
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <Field label="Search" htmlFor="c-search"><Input id="c-search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Name or phone number" /></Field>
        </div>
        <div className="w-full sm:w-56">
          <Field label="Group" htmlFor="c-group">
            <Select id="c-group" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">All groups</option>
              {(stats?.groups ?? []).map((g) => <option key={g.name} value={g.name}>{g.name} ({g.count})</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <Card className="overflow-hidden">
        {rows === undefined ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : shown.length === 0 ? (
          <EmptyState title={rows.length === 0 ? "No contacts yet" : "Nobody matches"} description={rows.length === 0 ? "Add people who have signed up to hear from your campaign. You will be asked how each of them agreed." : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Person</th>
                  <th className="px-5 py-3 font-medium">Group</th>
                  <th className="px-5 py-3 font-medium">Consent</th>
                  <th className="px-5 py-3 font-medium">Recorded</th>
                  {write && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((c) => (
                  <tr key={c.id} className={c.status === "opted_out" ? "opacity-60" : undefined}>
                    <td className="px-5 py-3.5"><p className="font-medium">{c.name || "No name"}</p><p className="text-muted">{c.phone}</p></td>
                    <td className="px-5 py-3.5 text-muted">{c.group || "None"}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={c.status === "opted_in" ? "success" : "neutral"}>{c.status === "opted_in" ? "Opted in" : "Opted out"}</Badge>
                      <p className="mt-1 max-w-56 truncate text-xs text-muted" title={c.source}>{c.source}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{dateFmt.format(c.at)}</td>
                    {write && (
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        {c.status === "opted_in" && <Button size="sm" variant="ghost" onClick={() => run(() => optOut({ contactId: c.id as Id<"contacts"> }))}>Mark opted out</Button>}
                        <Button size="sm" variant="ghost" onClick={() => run(() => remove({ contactId: c.id as Id<"contacts"> }))}>Delete</Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {rows && rows.length >= 100 && <p className="mt-3 text-sm text-muted">Showing the 100 most recent. Use the group filter to narrow the list.</p>}

      <ImportModal open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useMutation(api.contacts.importBatch);
  const [text, setText] = useState("");
  const [defaultGroup, setDefaultGroup] = useState("");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; duplicates: number; invalid: number } | null>(null);

  const parsed = useMemo(() => parseContacts(text, defaultGroup.trim()), [text, defaultGroup]);

  function close() {
    setText(""); setDefaultGroup(""); setSource(""); setConfirmed(false); setError(""); setResult(null);
    onClose();
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("That file is larger than 2 MB. Split it into smaller files.");
    setError("");
    setText(await file.text());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (parsed.valid.length === 0) return setError("There are no valid Kenyan phone numbers to add");
    setBusy(true);
    try {
      const total = { added: 0, duplicates: parsed.duplicates, invalid: parsed.invalid.length };
      for (let i = 0; i < parsed.valid.length; i += BATCH) {
        const r = await add({
          rows: parsed.valid.slice(i, i + BATCH).map((c) => ({ name: c.name || undefined, phone: c.phone, group: c.group || undefined })),
          consentSource: source,
          confirmConsent: confirmed,
        });
        total.added += r.added; total.duplicates += r.duplicates; total.invalid += r.invalid;
      }
      setResult(total);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={result ? "Contacts added" : "Add contacts"} description={result ? undefined : "Paste numbers or upload a CSV. One person per line: name, phone, group."}>
      {result ? (
        <div className="space-y-4">
          <p className="text-sm">{result.added.toLocaleString("en-KE")} added. {result.duplicates} already on file or repeated, {result.invalid} not valid numbers.</p>
          <div className="flex justify-end"><Button onClick={close}>Done</Button></div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}
          <Field label="Contacts" htmlFor="imp-text" hint="Kenyan mobile numbers only, such as 0712 345 678 or +254 712 345 678.">
            <textarea id="imp-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={"Wanjiku Kamau, 0712 345 678, Embakasi East\n0722 000 111"} className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Field>
          <input type="file" accept=".csv,.txt,text/csv,text/plain" aria-label="Upload a CSV file" onChange={(e) => readFile(e.target.files?.[0])} className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink" />
          {text.trim() && (
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{parsed.valid.length.toLocaleString("en-KE")}</span> valid
              {parsed.duplicates > 0 && `, ${parsed.duplicates} repeated`}
              {parsed.invalid.length > 0 && `, ${parsed.invalid.length} not recognised (e.g. "${parsed.invalid[0]}")`}
            </p>
          )}
          <Field label="Group for lines without one" htmlFor="imp-group" hint="Optional. Lets you message one group at a time.">
            <Input id="imp-group" value={defaultGroup} maxLength={40} onChange={(e) => setDefaultGroup(e.target.value)} />
          </Field>
          <Field label="How did these people opt in?" htmlFor="imp-source" hint="Kept as the record of consent. Example: signed membership forms, March 2026.">
            <Input id="imp-source" value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
            <span>Every person on this list agreed to receive messages from this campaign, and I can show proof if the Communications Authority asks.</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" loading={busy} disabled={!confirmed || parsed.valid.length === 0}>Add {parsed.valid.length > 0 ? parsed.valid.length.toLocaleString("en-KE") : ""} contacts</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
