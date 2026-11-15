"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { GrowBar, Stagger, StaggerItem } from "@/components/motion/motion";
import { useBase } from "@/hooks/use-me";

const nf = new Intl.NumberFormat("en-KE");
const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

const FLAG_TEXT: Record<string, string> = {
  OVER_REGISTERED: "Valid and rejected votes together exceed the voters registered at this station. Check the form and the figures.",
  ZERO_BALLOTS: "No ballots were recorded at this station. Confirm that is what the form says.",
};

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-r border-line px-6 py-5 first:pl-0 last:border-r-0 max-md:border-b max-md:px-0 max-md:last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="tnum mt-2.5 font-display text-4xl font-medium leading-none tracking-tight">{value}</p>
      {note && <p className="mt-1.5 text-sm text-muted">{note}</p>}
    </div>
  );
}

export default function TallyPage() {
  const base = useBase();
  const overview = useQuery(api.tally.overview);
  const stations = useQuery(api.tally.stations);
  const [open, setOpen] = useState<string | null>(null);

  const total = overview ? overview.validVotes : 0;
  const max = overview ? Math.max(1, ...overview.candidates.map((c) => c.votes)) : 1;

  return (
    <>
      <PageHeader
        kicker="Private to your campaign"
        title="Live tally"
        description="Built from the Form 34A figures your agents submit. Not published publicly, and unofficial: only the IEBC declares official results."
      />

      {overview === undefined ? (
        <Skeleton className="h-64" />
      ) : overview === null ? null : overview.stationsAssigned === 0 ? (
        <Card>
          <EmptyState
            title="No stations to track yet"
            description="Add agents and assign them polling stations. Results appear here as soon as they submit."
            action={
              <Link href={`${base}/agents`} className="inline-flex h-10 items-center bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
                Add agents
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <section className="grid border-y border-line md:grid-cols-4" aria-label="Summary">
            <Figure
              label="Stations reporting"
              value={`${nf.format(overview.stationsReported)} of ${nf.format(overview.stationsAssigned)}`}
              note={`${((overview.stationsReported / overview.stationsAssigned) * 100).toFixed(1)}% of your stations`}
            />
            <Figure label="Valid votes" value={nf.format(overview.validVotes)} />
            <Figure label="Rejected" value={nf.format(overview.rejected)} />
            <Figure
              label="Needs checking"
              value={nf.format(overview.flagged)}
              note={overview.turnoutPercent !== null ? `${overview.turnoutPercent.toFixed(1)}% turnout in reporting stations` : undefined}
            />
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Candidates</h2>
            <Stagger as="ul">
              {overview.candidates
                .map((c, i) => ({ ...c, i }))
                .sort((a, b) => b.votes - a.votes)
                .map((c, rank) => (
                  <StaggerItem as="li" key={c.id} className="grid grid-cols-[2rem_1fr_9rem] items-center gap-x-4 gap-y-1 border-b border-line py-4 first:pt-0">
                    <span className="font-display text-xl text-subtle">{rank + 1}</span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-2 font-semibold">
                        {c.name}
                        {c.party && <span className="text-sm font-normal text-muted">{c.party}</span>}
                        {c.isOurs && <Badge tone="primary">You</Badge>}
                      </p>
                      <div className="mt-2 h-2.5 bg-surface-2">
                        <GrowBar className={`h-full fill-${c.i % 5}`} percent={(c.votes / max) * 100} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tnum font-display text-2xl font-medium">{nf.format(c.votes)}</p>
                      <p className="tnum text-sm text-muted">{total > 0 ? ((c.votes / total) * 100).toFixed(1) : "0.0"}%</p>
                    </div>
                  </StaggerItem>
                ))}
            </Stagger>
          </section>

          <section className="mt-12">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Polling stations</h2>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Station</th>
                    <th className="px-5 py-3 font-medium">Agent</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Registered</th>
                    <th className="px-5 py-3 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(stations ?? [])
                    .slice()
                    .sort((a, b) => ({ flagged: 0, awaiting: 1, reported: 2 })[a.status] - { flagged: 0, awaiting: 1, reported: 2 }[b.status] || a.name.localeCompare(b.name))
                    .map((s) => (
                      <tr key={s.code} className={s.status !== "awaiting" ? "cursor-pointer hover:bg-surface-2" : ""} onClick={() => s.status !== "awaiting" && setOpen(s.code)}>
                        <td className="px-5 py-3.5 font-medium">{s.name}</td>
                        <td className="px-5 py-3.5 text-muted">{s.agents.join(", ")}</td>
                        <td className="px-5 py-3.5">
                          {s.status === "reported" && (
                            <span className="inline-flex items-center gap-1.5 text-success">
                              <CheckCircle2 className="size-4" aria-hidden="true" /> Reported
                            </span>
                          )}
                          {s.status === "flagged" && (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
                              <AlertTriangle className="size-4" aria-hidden="true" /> Needs checking
                            </span>
                          )}
                          {s.status === "awaiting" && (
                            <span className="inline-flex items-center gap-1.5 text-muted">
                              <Clock className="size-4" aria-hidden="true" /> Awaiting
                            </span>
                          )}
                        </td>
                        <td className="tnum px-5 py-3.5 text-right">{nf.format(s.voters)}</td>
                        <td className="tnum px-5 py-3.5 text-right text-muted">{s.submittedAt ? dateFmt.format(s.submittedAt) : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}

      <StationDetail code={open} onClose={() => setOpen(null)} names={overview?.candidates ?? []} stationName={stations?.find((s) => s.code === open)?.name ?? ""} />
    </>
  );
}

function StationDetail({
  code,
  onClose,
  names,
  stationName,
}: {
  code: string | null;
  onClose: () => void;
  names: { id: string; name: string }[];
  stationName: string;
}) {
  const sub = useQuery(api.tally.submission, code ? { stationCode: code } : "skip");
  const nameOf = (id: string) => names.find((n) => n.id === id)?.name ?? "Candidate";
  return (
    <Modal open={!!code} onClose={onClose} title={stationName || "Station"} description={sub ? `Submitted by ${sub.agent} · ${dateFmt.format(sub.submittedAt)}${sub.versions > 1 ? ` · version ${sub.versions}` : ""}` : undefined}>
      {sub === undefined ? (
        <Skeleton className="h-48" />
      ) : sub === null ? (
        <p className="text-sm text-muted">No submission yet.</p>
      ) : (
        <div className="space-y-4">
          {sub.flags.map((f) => (
            <div key={f} role="alert" className="flex gap-2 border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {FLAG_TEXT[f] ?? f}
            </div>
          ))}
          <table className="tnum w-full text-sm">
            <tbody className="divide-y divide-line">
              {sub.votes.map((v) => (
                <tr key={v.candidateId}>
                  <td className="py-2">{nameOf(v.candidateId)}</td>
                  <td className="py-2 text-right font-semibold">{nf.format(v.votes)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 text-muted">Rejected</td>
                <td className="py-2 text-right font-semibold">{nf.format(sub.rejected)}</td>
              </tr>
            </tbody>
          </table>
          {sub.imageUrl ? (
            <a href={sub.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sub.imageUrl} alt={`Form 34A photo for ${stationName}`} className="max-h-96 w-full border border-line object-contain" />
              <span className="mt-1 block text-xs text-muted">Tap the photo to open it full size and compare it with the figures above.</span>
            </a>
          ) : (
            <p className="text-sm text-muted">The photo is unavailable.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
