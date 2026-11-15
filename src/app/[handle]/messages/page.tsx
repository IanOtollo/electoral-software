"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui/primitives";
import { errorMessage, useMe } from "@/hooks/use-me";
import { MIN_LEAD_MS } from "../../../../convex/lib/sms";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" });
const MAX_BODY = 480;
// 08:00 to 16:30 East Africa Time: the Communications Authority allows bulk political messages only from 08:00 to 17:00.
const TIMES = Array.from({ length: 18 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "primary" }> = {
  submitted: { label: "Waiting for approval", tone: "warning" },
  approved: { label: "Approved, will send at the set time", tone: "info" },
  refused: { label: "Refused", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  sending: { label: "Sending", tone: "primary" },
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Stopped", tone: "danger" },
};

/** "2027-03-02" + "09:30" read as East Africa Time (UTC+3, no daylight saving). */
const eatMs = (date: string, time: string) => new Date(`${date}T${time}:00+03:00`).getTime();

export default function MessagesPage() {
  const { can } = useMe();
  const list = useQuery(api.messages.list, can("sms:read") ? {} : "skip");
  const cancel = useMutation(api.messages.cancel);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState("");

  if (!can("sms:read")) return <EmptyState title="You do not have access to messaging" />;

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try { await fn(); } catch (e) { setError(errorMessage(e)); }
  }

  return (
    <>
      <PageHeader
        kicker="Voter messaging"
        title="Messages"
        description="Political messages follow the Communications Authority process: they are approved before sending, scheduled at least 48 hours ahead, and go only to people who opted in."
        actions={can("sms:send") && !composing && <Button onClick={() => setComposing(true)}><Send className="size-4" /> New message</Button>}
      />
      {error && <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}

      {composing && <Compose onDone={() => setComposing(false)} />}

      <Card className="overflow-hidden">
        {list === undefined ? (
          <div className="space-y-3 p-5"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : list.length === 0 ? (
          <EmptyState title="No messages yet" description="Write a message, attach the sponsor's signed authorisation, and it goes to review." />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((m) => {
              const s = STATUS[m.status] ?? { label: m.status, tone: "neutral" as const };
              return (
                <li key={m.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <p className="text-sm text-muted">{dateFmt.format(m.scheduledFor)} EAT · {m.targetGroup ?? "All opted-in contacts"}</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <p className="text-sm text-muted">
                    {m.recipients.toLocaleString("en-KE")} people · {m.segments} {m.segments === 1 ? "part" : "parts"} each · sponsor {m.sponsorName}
                  </p>
                  {(m.status === "sent" || m.status === "sending" || m.status === "failed") && (
                    <p className="text-sm">
                      <span className="font-medium">{m.accepted.toLocaleString("en-KE")}</span> accepted by the network ·{" "}
                      <span className="font-medium">{m.delivered.toLocaleString("en-KE")}</span> confirmed delivered ·{" "}
                      <span className="font-medium">{m.rejected.toLocaleString("en-KE")}</span> not sent
                    </p>
                  )}
                  {m.reviewNote && <p className="text-sm text-danger">Reviewer: {m.reviewNote}</p>}
                  {m.failureNote && <p className="text-sm text-danger">{m.failureNote}</p>}
                  {can("sms:send") && (m.status === "submitted" || m.status === "approved") && (
                    <Button size="sm" variant="ghost" onClick={() => run(() => cancel({ messageId: m.id as Id<"sms_messages"> }))}>Cancel this message</Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function Compose({ onDone }: { onDone: () => void }) {
  const { me } = useMe();
  const stats = useQuery(api.contacts.stats, {});
  const submit = useMutation(api.messages.submit);
  const upload = useMutation(api.messages.generateUploadUrl);

  const [body, setBody] = useState("");
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [sponsor, setSponsor] = useState("");
  const [group, setGroup] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [letter, setLetter] = useState<File | null>(null);
  const [identity, setIdentity] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useQuery(api.messages.preview, { body, targetGroup: group || undefined });
  const when = date ? eatMs(date, time) : null;
  const [earliest] = useState(() => new Date(Date.now() + MIN_LEAD_MS + 3 * 3600_000).toISOString().slice(0, 10));
  const parts = preview?.segments ?? 1;
  const people = preview?.recipients ?? 0;
  const cost = people * parts;
  const sponsorMissing = sponsor.trim().length >= 3 && body.trim() && !body.toLowerCase().includes(sponsor.trim().toLowerCase());

  async function send(file: File) {
    const url = await upload();
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
    if (!res.ok) throw new Error("upload");
    return ((await res.json()) as { storageId: Id<"_storage"> }).storageId;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!when) return setError("Choose the date to send");
    if (!letter || !identity) return setError("Attach the sponsor's signed authorisation letter and identification");
    setBusy(true);
    try {
      const [authorizationStorageId, identityStorageId] = [await send(letter), await send(identity)];
      await submit({ body, language, sponsorName: sponsor, targetGroup: group || undefined, scheduledFor: when, authorizationStorageId, identityStorageId, confirmContent: confirmed });
      onDone();
    } catch (err) {
      setError((err as Error).message === "upload" ? "A file did not upload. Please try again." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-8 p-6">
      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-2" noValidate>
        <h2 className="text-lg font-semibold tracking-tight lg:col-span-2">New message</h2>
        {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger lg:col-span-2">{error}</div>}

        <div className="space-y-5">
          <Field label="Message" htmlFor="m-body" hint={`${[...body].length}/${MAX_BODY} characters · ${parts} ${parts === 1 ? "part" : "parts"} per person. Must be in English or Kiswahili and name the sponsor.`}>
            <textarea id="m-body" value={body} maxLength={MAX_BODY} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Language" htmlFor="m-lang">
              <Select id="m-lang" value={language} onChange={(e) => setLanguage(e.target.value as "en" | "sw")}>
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
              </Select>
            </Field>
            <Field label="Send to" htmlFor="m-group">
              <Select id="m-group" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">All opted-in contacts ({stats?.optedIn ?? 0})</option>
                {(stats?.groups ?? []).map((g) => <option key={g.name} value={g.name}>{g.name} ({g.count})</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Sponsor" htmlFor="m-sponsor" hint="The person or party the message is sent for. It must appear in the text.">
            <Input id="m-sponsor" value={sponsor} onChange={(e) => setSponsor(e.target.value)} />
          </Field>
          {sponsorMissing && <p role="status" className="text-sm text-danger">The text does not mention {sponsor.trim()} yet.</p>}
        </div>

        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Send on" htmlFor="m-date" hint="At least 48 hours from now.">
              <Input id="m-date" type="date" min={earliest} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="At (East Africa Time)" htmlFor="m-time" hint="Between 08:00 and 17:00.">
              <Select id="m-time" value={time} onChange={(e) => setTime(e.target.value)}>
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Sponsor's signed authorisation letter" htmlFor="m-letter" hint="PDF or image, up to 10 MB.">
            <input id="m-letter" type="file" accept="application/pdf,image/*" onChange={(e) => setLetter(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink" />
          </Field>
          <Field label="Sponsor's identification" htmlFor="m-id" hint="National ID or party registration certificate.">
            <input id="m-id" type="file" accept="application/pdf,image/*" onChange={(e) => setIdentity(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink" />
          </Field>

          <div className="border border-line bg-surface-2 p-4 text-sm">
            <p><span className="font-semibold">{people.toLocaleString("en-KE")}</span> people × {parts} {parts === 1 ? "part" : "parts"} = <span className="font-semibold">{cost.toLocaleString("en-KE")}</span> SMS credits</p>
            <p className={preview && cost > preview.credits ? "mt-1 text-danger" : "mt-1 text-muted"}>
              Your balance is {(preview?.credits ?? 0).toLocaleString("en-KE")}.
              {preview && cost > preview.credits && " That is not enough to send this message. Ask the platform for more credit before the send time."}
            </p>
            {me?.tenant && !me.tenant.senderId && <p className="mt-1 text-muted">No sender name is set yet, so messages go from the network&apos;s shared sender.</p>}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
            <span>This message is in English or Kiswahili and contains nothing hateful, threatening, abusive or misleading.</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
            <Button type="submit" loading={busy} disabled={!confirmed}>Submit for approval</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
