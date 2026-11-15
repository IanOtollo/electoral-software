"use client";

import { useEffect, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { ChevronDown, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, Skeleton } from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
import { AUDIT_GROUPS, describeAction, severityOf } from "@/lib/audit-labels";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "medium", timeZone: "Africa/Nairobi" });
const DAY = 24 * 60 * 60 * 1000;
const EXPORT_CAP = 5000;

type Filters = { workspace: string; group: string; actorId: string; text: string; from?: number; to?: number };
type Row = {
  id: string; action: string; entityType: string; entityId: string; metadata: unknown; hash: string; prevHash: string; createdAt: number;
  actor: { id: string; name: string; email: string; role: string } | null; workspace: { id: string; name: string } | null;
};

const eatStart = (d: string) => new Date(`${d}T00:00:00+03:00`).getTime();
const eatEnd = (d: string) => new Date(`${d}T23:59:59.999+03:00`).getTime();
const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** One audit explorer for both consoles. `admin` searches every workspace; otherwise it shows the signed-in workspace only. */
export function AuditExplorer({ admin }: { admin: boolean }) {
  const convex = useConvex();
  const logExport = useMutation(api.admin.logExport);

  const workspaces = useQuery(api.admin.workspaces, admin ? {} : "skip");
  const adminActors = useQuery(api.admin.auditActors, admin ? {} : "skip");
  const ownActors = useQuery(api.audit.actors, admin ? "skip" : {});
  const actors = admin ? adminActors : ownActors;

  const [f, setF] = useState<Filters>({ workspace: "", group: "", actorId: "", text: "" });
  const [draft, setDraft] = useState("");
  const [range, setRange] = useState("all");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [verify, setVerify] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const summary = useQuery(api.admin.auditSummary, admin ? { from: f.from, to: f.to } : "skip");
  const scope = admin ? (f.workspace === "platform" ? "platform" : f.workspace) : "own";
  const chain = useQuery(
    api.audit.verifyChain,
    verify && scope !== "" ? { tenantId: scope === "own" || scope === "platform" ? undefined : (scope as Id<"tenants">) } : "skip",
  );

  const change = (patch: Partial<Filters>) => { setF((c) => ({ ...c, ...patch })); setVerify(false); };

  function preset(value: string) {
    setRange(value);
    const now = new Date().getTime();
    if (value === "all") change({ from: undefined, to: undefined });
    else if (value === "24h") change({ from: now - DAY, to: undefined });
    else if (value === "7d") change({ from: now - 7 * DAY, to: undefined });
    else if (value === "30d") change({ from: now - 30 * DAY, to: undefined });
  }
  function applyCustom(next: { from: string; to: string }) {
    setCustom(next);
    change({ from: next.from ? eatStart(next.from) : undefined, to: next.to ? eatEnd(next.to) : undefined });
  }

  const args = (before?: number) => ({
    workspace: !admin || !f.workspace ? undefined : f.workspace === "platform" ? ("platform" as const) : (f.workspace as Id<"tenants">),
    group: f.group || undefined,
    actorId: f.actorId ? (f.actorId as Id<"users">) : undefined,
    text: f.text.trim() || undefined,
    from: f.from,
    to: f.to,
    before,
  });

  async function exportCsv() {
    setError("");
    setExporting(true);
    try {
      const all: Row[] = [];
      let before: number | undefined;
      for (let i = 0; i < 100 && all.length < EXPORT_CAP; i++) {
        const res: { rows: Row[]; next: number | null } = admin
          ? await convex.query(api.admin.auditSearch, args(before) as never)
          : await convex.query(api.audit.search, { ...(({ workspace: _w, ...rest }) => rest)(args(before)) } as never);
        all.push(...res.rows);
        if (res.next === null) break;
        before = res.next;
      }
      const head = ["Time (EAT)", "Time (ISO)", "Actor", "Email", "Role", "Workspace", "Action", "What happened", "Entity", "Entity id", "Details", "Hash"];
      const lines = all.map((r) => [
        when.format(r.createdAt), new Date(r.createdAt).toISOString(), r.actor?.name ?? "System", r.actor?.email ?? "", r.actor?.role ?? "",
        r.workspace?.name ?? "Platform", r.action, describeAction(r.action, r.metadata), r.entityType, r.entityId, JSON.stringify(r.metadata ?? {}), r.hash,
      ].map(csv).join(","));
      const blob = new Blob(["﻿" + [head.map(csv).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      if (admin) await logExport({ entries: all.length, filters: JSON.stringify({ ...f, workspace: f.workspace || "all" }) });
    } catch {
      setError("The export did not finish. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {admin && (
        <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entries" value={summary ? `${summary.total.toLocaleString("en-KE")}${summary.approximate ? "+" : ""}` : undefined} note="in the chosen period" />
          <Stat label="Security events" value={summary ? summary.failures.toLocaleString("en-KE") : undefined} note="failed sign-ins and lockouts" warn={!!summary?.failures} />
          <Stat label="Results" value={summary ? (summary.byKind.result ?? 0).toLocaleString("en-KE") : undefined} note="submitted or corrected" />
          <Stat label="Admin actions" value={summary ? (summary.byKind.platform ?? 0).toLocaleString("en-KE") : undefined} note="by platform administrators" />
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); change({ text: draft }); }} className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-2">
          <Field label="Search" htmlFor="au-text" hint="Matches the action, person, record number or details.">
            <Input id="au-text" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== f.text && change({ text: draft })} placeholder="Name, email, station, station code..." />
          </Field>
        </div>
        <Field label="Kind of action" htmlFor="au-group">
          <Select id="au-group" value={f.group} onChange={(e) => change({ group: e.target.value })}>
            {AUDIT_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
        </Field>
        <Field label="Period" htmlFor="au-range">
          <Select id="au-range" value={range} onChange={(e) => (e.target.value === "custom" ? setRange("custom") : preset(e.target.value))}>
            <option value="all">All time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Choose dates</option>
          </Select>
        </Field>
        {admin && (
          <div className="md:col-span-2 xl:col-span-2">
            <Field label="Workspace" htmlFor="au-ws">
              <Combobox id="au-ws" value={f.workspace} onChange={(e) => change({ workspace: e.target.value })}>
                <option value="">All workspaces</option>
                <option value="platform">Platform events only</option>
                {(workspaces ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Combobox>
            </Field>
          </div>
        )}
        <div className={admin ? "md:col-span-2 xl:col-span-2" : "md:col-span-2 xl:col-span-2"}>
          <Field label="Person" htmlFor="au-actor">
            <Combobox id="au-actor" value={f.actorId} onChange={(e) => change({ actorId: e.target.value })}>
              <option value="">Anyone</option>
              {(actors ?? []).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
            </Combobox>
          </Field>
        </div>
        {range === "custom" && (
          <>
            <Field label="From" htmlFor="au-from"><Input id="au-from" type="date" value={custom.from} onChange={(e) => applyCustom({ ...custom, from: e.target.value })} /></Field>
            <Field label="To" htmlFor="au-to"><Input id="au-to" type="date" value={custom.to} onChange={(e) => applyCustom({ ...custom, to: e.target.value })} /></Field>
          </>
        )}
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setVerify(true)} disabled={scope === ""} title={scope === "" ? "Choose a workspace or Platform events to verify its chain" : undefined}>
          <ShieldCheck className="size-4" /> Verify integrity
        </Button>
        <Button variant="secondary" onClick={exportCsv} loading={exporting}><Download className="size-4" /> Export CSV</Button>
        {scope === "" && <span className="text-sm text-muted">Pick a workspace to verify its chain.</span>}
        {verify && chain && (chain.valid
          ? <Badge tone="success"><ShieldCheck className="mr-1 size-3.5" /> Intact · {chain.entries.toLocaleString("en-KE")} entries checked</Badge>
          : <Badge tone="danger"><ShieldAlert className="mr-1 size-3.5" /> Altered or missing entries detected</Badge>)}
        {verify && chain === undefined && <Skeleton className="h-6 w-40" />}
      </div>
      {error && <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">{error}</div>}

      <Pages key={JSON.stringify(f)} admin={admin} args={args} />
    </>
  );
}

function Stat({ label, value, note, warn }: { label: string; value?: string; note: string; warn?: boolean }) {
  return (
    <div className="bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      {value === undefined ? <Skeleton className="mt-2 h-8 w-16" /> : <p className={cn("mt-1 text-2xl font-semibold tabular-nums", warn && "text-danger")}>{value}</p>}
      <p className="text-xs text-muted">{note}</p>
    </div>
  );
}

/** Pages of results. Each page is its own live query; "Load older" adds the next one below. */
function Pages({ admin, args }: { admin: boolean; args: (before?: number) => Record<string, unknown> }) {
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [nexts, setNexts] = useState<Record<number, number | null>>({});
  const last = cursors.length - 1;
  const lastNext = nexts[last];

  return (
    <>
      <Card className="overflow-hidden">
        {cursors.map((c, i) => (
          <Page key={i} admin={admin} before={c} args={args} first={i === 0} onNext={(n) => setNexts((x) => (x[i] === n ? x : { ...x, [i]: n }))} />
        ))}
      </Card>
      {lastNext != null && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setCursors((c) => [...c, lastNext])}>Load older entries</Button>
        </div>
      )}
    </>
  );
}

function Page({ admin, before, args, first, onNext }: { admin: boolean; before?: number; args: (before?: number) => Record<string, unknown>; first: boolean; onNext: (n: number | null) => void }) {
  const a = args(before);
  const all = useQuery(api.admin.auditSearch, admin ? (a as never) : "skip");
  const own = useQuery(api.audit.search, admin ? "skip" : ((({ workspace: _w, ...rest }) => rest)(a as { workspace?: unknown }) as never));
  const res = (admin ? all : own) as { rows: Row[]; next: number | null; capped: boolean } | undefined;
  const [open, setOpen] = useState<string | null>(null);

  const next = res ? res.next : undefined;
  useEffect(() => {
    if (next !== undefined) onNext(next);
  }, [next, onNext]);

  if (res === undefined) return <div className="space-y-3 p-5"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>;
  if (res.rows.length === 0) return first ? <EmptyState title="No matching activity" description={res.next !== null ? "Nothing in the part of the log searched so far. Load older entries to keep looking." : "Try a wider period or fewer filters."} /> : <p className="px-5 py-4 text-sm text-muted">No more matching entries{res.next !== null ? " in this stretch. Load older entries to keep looking." : "."}</p>;

  return (
    <ul className="divide-y divide-line">
      {res.rows.map((r) => {
        const sev = severityOf(r.action, r.metadata);
        const expanded = open === r.id;
        return (
          <li key={r.id}>
            <button type="button" onClick={() => setOpen(expanded ? null : r.id)} aria-expanded={expanded} className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-surface-2">
              <span aria-hidden="true" className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", sev === "alert" ? "bg-danger" : sev === "notice" ? "bg-warning" : "bg-line-strong")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{describeAction(r.action, r.metadata)}{sev !== "normal" && <span className="sr-only"> ({sev === "alert" ? "needs attention" : "worth a look"})</span>}</span>
                <span className="block text-sm text-muted">{r.actor ? `${r.actor.name} · ${r.actor.role.replace(/_/g, " ")}` : "System"}{admin ? ` · ${r.workspace?.name ?? "Platform"}` : ""}</span>
              </span>
              <time className="shrink-0 text-sm tabular-nums text-muted" dateTime={new Date(r.createdAt).toISOString()}>{when.format(r.createdAt)}</time>
              <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted transition-transform", expanded && "rotate-180")} aria-hidden="true" />
            </button>
            {expanded && <Detail r={r} />}
          </li>
        );
      })}
    </ul>
  );
}

function Detail({ r }: { r: Row }) {
  const meta = r.metadata && typeof r.metadata === "object" ? Object.entries(r.metadata as Record<string, unknown>) : [];
  const row = (k: string, v: string) => (
    <div key={`${k}:${v}`} className="grid gap-1 sm:grid-cols-[9rem_1fr]"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>
  );
  return (
    <dl className="space-y-1.5 border-t border-line bg-surface-2 px-5 py-4 pl-11 text-sm">
      {row("Action code", r.action)}
      {row("Done by", r.actor ? `${r.actor.name} <${r.actor.email}>` : "The system, automatically")}
      {row("Record", `${r.entityType} · ${r.entityId}`)}
      {meta.map(([k, v]) => row(k.replace(/([A-Z])/g, " $1").replace(/_/g, " "), typeof v === "object" ? JSON.stringify(v) : String(v)))}
      {row("Entry fingerprint", r.hash)}
      {row("Links back to", r.prevHash)}
    </dl>
  );
}
