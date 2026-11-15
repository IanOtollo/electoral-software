"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { errorMessage } from "@/hooks/use-me";

const nf = new Intl.NumberFormat("en-KE");
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" });

export default function MessageApprovalsPage() {
  const queue = useQuery(api.messages.adminQueue);
  const history = useQuery(api.messages.adminHistory);
  const decide = useMutation(api.messages.adminDecide);
  const [error, setError] = useState("");
  const [refusing, setRefusing] = useState<{ id: Id<"sms_messages">; workspace: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function approve(id: Id<"sms_messages">) {
    setError("");
    try {
      await decide({ messageId: id, decision: "approved" });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function refuse() {
    if (!refusing) return;
    setBusy(true); setError("");
    try {
      await decide({ messageId: refusing.id, decision: "refused", note });
      setRefusing(null); setNote("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        kicker="Political messaging"
        title="Message approvals"
        description="Requests are checked here against the Communications Authority's rules before they go to the licensed provider and the networks for vetting. Times are East Africa Time."
      />

      {error && <div role="alert" className="mb-4 border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Waiting for a decision{queue ? ` (${queue.length})` : ""}</h2>
        {queue === undefined ? (
          <Skeleton className="h-40" />
        ) : queue.length === 0 ? (
          <Card><EmptyState title="Nothing is waiting" description="New requests from campaigns appear here as they are submitted." /></Card>
        ) : (
          <div className="space-y-5">
            {queue.map((m) => (
              <Card key={m.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.workspace}</p>
                    <p className="text-sm text-muted">Sponsor: {m.sponsorName} · {m.language === "sw" ? "Kiswahili" : "English"} · submitted {when.format(m.createdAt)}</p>
                  </div>
                  <Badge tone="warning">Send at {when.format(m.scheduledFor)}</Badge>
                </div>
                <blockquote className="my-4 whitespace-pre-wrap border-l-4 border-desk bg-surface-2 px-4 py-3 text-[0.95rem]">{m.body}</blockquote>
                <p className="tnum text-sm text-muted">
                  {nf.format(m.recipients)} recipient{m.recipients === 1 ? "" : "s"} · {m.segments} part{m.segments === 1 ? "" : "s"} each · {nf.format(m.recipients * m.segments)} credits · {m.targetGroup ? `group "${m.targetGroup}"` : "all opted-in contacts"}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  {m.authorizationUrl && <a href={m.authorizationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">Authorisation letter <ExternalLink className="size-3.5" aria-hidden="true" /></a>}
                  {m.identityUrl && <a href={m.identityUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">Identification <ExternalLink className="size-3.5" aria-hidden="true" /></a>}
                </div>
                <div className="mt-5 flex gap-2 border-t border-line pt-4">
                  <Button onClick={() => approve(m.id as Id<"sms_messages">)}>Approve</Button>
                  <Button variant="secondary" onClick={() => setRefusing({ id: m.id as Id<"sms_messages">, workspace: m.workspace })}>Refuse</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Recently decided</h2>
        <Card className="overflow-x-auto">
          {history === undefined ? (
            <Skeleton className="m-5 h-16" />
          ) : history.length === 0 ? (
            <p className="p-5 text-sm text-muted">No decisions yet.</p>
          ) : (
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-5 py-3 font-medium">Workspace</th><th className="px-5 py-3 font-medium">Message</th><th className="px-5 py-3 font-medium">Decision</th><th className="px-5 py-3 font-medium">When</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-3.5 font-medium">{h.workspace}</td>
                    <td className="max-w-xs px-5 py-3.5"><p className="truncate">{h.body}</p>{h.reviewNote && <p className="truncate text-muted">Note: {h.reviewNote}</p>}</td>
                    <td className="px-5 py-3.5"><Badge tone={h.status === "approved" ? "success" : "danger"}>{h.status === "approved" ? "Approved" : "Refused"}</Badge></td>
                    <td className="px-5 py-3.5 text-muted">{h.reviewedAt ? when.format(h.reviewedAt) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <Modal open={!!refusing} onClose={() => { setRefusing(null); setNote(""); }} title="Refuse this message" description={refusing ? `The reason is shown to ${refusing.workspace} so they can fix it.` : undefined}>
        <div className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="refuse-note">Reason</label>
          <textarea id="refuse-note" rows={4} autoFocus value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-line-strong bg-surface p-3 text-base focus:border-ink focus:outline-none" placeholder="For example: the message is not in English or Kiswahili, or the authorisation letter is not signed." />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setRefusing(null); setNote(""); }}>Cancel</Button>
            <Button variant="danger" onClick={refuse} loading={busy} disabled={note.trim().length < 5}>Refuse message</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
