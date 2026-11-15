"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Badge, Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { describeAction } from "@/lib/audit-labels";

const nf = new Intl.NumberFormat("en-KE");
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });
const TONE = { active: "success", trial: "info", suspended: "danger" } as const;

function Figure({ label, value, note, href }: { label: string; value: React.ReactNode; note?: React.ReactNode; href?: string }) {
  const body = (
    <div className="h-full border border-line bg-surface p-5 transition-colors hover:bg-surface-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="tnum mt-2.5 font-display text-4xl font-medium leading-none tracking-tight">{value}</p>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminOverview() {
  const o = useQuery(api.admin.overview);

  return (
    <>
      <PageHeader kicker="Platform" title="Overview" description="How the platform is doing right now, and what needs you." />

      {o === undefined ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          {o.approximate && <p className="mb-4 border border-warning/40 bg-warning-soft px-4 py-2.5 text-sm text-warning">The platform is large enough that some totals below are approximate.</p>}

          <section aria-label="Needs attention" className="mb-8 space-y-3">
            {o.messages.pendingApproval > 0 && (
              <Link href="/admin/messages" className="flex items-center justify-between gap-4 border border-warning/40 bg-warning-soft px-5 py-4 text-warning hover:brightness-95">
                <span className="flex items-center gap-3 font-medium">
                  <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
                  {o.messages.pendingApproval} political message{o.messages.pendingApproval === 1 ? "" : "s"} waiting for approval
                  {o.messages.oldestPending && <span className="font-normal opacity-80">· oldest submitted {when.format(o.messages.oldestPending)}</span>}
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            )}
            {o.field.flagged > 0 && (
              <div className="flex items-center gap-3 border border-danger/40 bg-danger-soft px-5 py-4 font-medium text-danger">
                <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
                {o.field.flagged} polling-station result{o.field.flagged === 1 ? " is" : "s are"} flagged for a check across all campaigns
              </div>
            )}
            {o.workspaces.suspended > 0 && (
              <Link href="/admin/workspaces" className="flex items-center justify-between gap-4 border border-line bg-surface px-5 py-4 hover:bg-surface-2">
                <span className="font-medium">{o.workspaces.suspended} workspace{o.workspaces.suspended === 1 ? " is" : "s are"} suspended</span>
                <ArrowRight className="size-4 text-muted" aria-hidden="true" />
              </Link>
            )}
            {o.messages.pendingApproval === 0 && o.field.flagged === 0 && o.workspaces.suspended === 0 && (
              <p className="border border-success/40 bg-success-soft px-5 py-4 font-medium text-success">Nothing needs your attention.</p>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Platform figures">
            <Figure label="Workspaces" value={nf.format(o.workspaces.total)} note={`${o.workspaces.active} active · ${o.workspaces.trial} trial · ${o.workspaces.newThisWeek} new this week`} href="/admin/workspaces" />
            <Figure label="People" value={nf.format(o.users.total)} note={Object.entries(o.users.byRole).map(([r, n]) => `${n} ${r.replace(/_/g, " ")}`).join(" · ")} href="/admin/users" />
            <Figure label="Field agents" value={nf.format(o.field.agents)} note={`${nf.format(o.field.stationsAssigned)} stations assigned`} />
            <Figure label="Stations reported" value={nf.format(o.field.stationsReported)} note={`of ${nf.format(o.field.stationsAssigned)} assigned across campaigns`} />
            <Figure label="Flagged results" value={nf.format(o.field.flagged)} note="Need a human check" />
            <Figure label="Awaiting approval" value={nf.format(o.messages.pendingApproval)} note="Political messages" href="/admin/messages" />
            <Figure label="SMS credit outstanding" value={nf.format(o.smsCreditsOutstanding)} note="Granted, not yet used" />
            <Figure label="New sign-ups (7 days)" value={nf.format(o.workspaces.newThisWeek)} note="Campaign workspaces" />
          </section>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Newest workspaces</h2>
              <Card className="divide-y divide-line">
                {o.newest.length === 0 && <p className="p-5 text-sm text-muted">None yet.</p>}
                {o.newest.map((w) => (
                  <Link key={w.id} href={`/admin/workspaces/${w.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{w.name}</span>
                      <span className="text-xs text-muted">{when.format(w.createdAt)}</span>
                    </span>
                    <Badge tone={TONE[w.status]}>{w.status}</Badge>
                  </Link>
                ))}
              </Card>
            </section>

            <section>
              <h2 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Recent activity
                <Link href="/admin/audit" className="font-medium normal-case tracking-normal text-ink underline underline-offset-4">View all</Link>
              </h2>
              <Card className="divide-y divide-line">
                {o.activity.length === 0 && <p className="p-5 text-sm text-muted">No activity yet.</p>}
                {o.activity.map((a) => (
                  <div key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{describeAction(a.action)}</p>
                    <p className="text-xs text-muted">
                      {a.actor} · {a.workspace} · {when.format(a.createdAt)}
                    </p>
                  </div>
                ))}
              </Card>
            </section>
          </div>
        </>
      )}
    </>
  );
}
