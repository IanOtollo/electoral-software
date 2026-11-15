"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { InviteLink } from "@/components/invite-link";
import { errorMessage } from "@/hooks/use-me";
import { describeAction } from "@/lib/audit-labels";
import { ROLE_LABELS, type Role } from "../../../../../../convex/lib/permissions";

const nf = new Intl.NumberFormat("en-KE");
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });
const TONE = { active: "success", trial: "info", suspended: "danger" } as const;
const PLANS = ["starter", "constituency", "county", "national"] as const;
type Plan = (typeof PLANS)[number];
type Status = "trial" | "active" | "suspended";
type Module = "sms" | "tally";

type Detail = NonNullable<ReturnType<typeof useDetail>>;
function useDetail(id: Id<"tenants">) {
  return useQuery(api.admin.workspace, { tenantId: id });
}

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id as Id<"tenants">;
  const data = useDetail(tenantId);
  const [link, setLink] = useState<{ title: string; token: string; path: string; note: string } | null>(null);
  const [error, setError] = useState("");
  const reissue = useMutation(api.admin.reissueInvite);

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (data === undefined) return <Skeleton className="h-96 max-w-4xl" />;
  if (data === null)
    return (
      <>
        <Back />
        <EmptyState title="This workspace no longer exists" description="It may have been deleted." />
      </>
    );

  const { tenant: t } = data;
  return (
    <>
      <Back />
      <PageHeader
        kicker="Workspace"
        title={t.name}
        description={`Address /${t.slug} · created ${when.format(t.createdAt)}${t.office ? ` · contesting ${t.office.replace("_", " ")}` : ""}`}
        actions={<Badge tone={TONE[t.status]}>{t.status[0].toUpperCase() + t.status.slice(1)}</Badge>}
      />

      {error && (
        <div role="alert" className="mb-6 border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="mb-8 grid border-y border-line sm:grid-cols-2 lg:grid-cols-5" aria-label="Figures">
        {[
          ["Users", `${data.users.filter((u) => u.status === "active").length}`, `${data.users.length} accounts`],
          ["Agents", `${data.figures.agentsActive}`, `${data.figures.agents} in total`],
          ["Stations reported", `${nf.format(data.figures.stationsReported)}`, `of ${nf.format(data.figures.stationsAssigned)} assigned`],
          ["Flagged", `${data.figures.flagged}`, "results to check"],
          ["Contacts", `${nf.format(data.contacts.optedIn)}`, `${nf.format(data.contacts.total)} on file`],
        ].map(([l, v, n]) => (
          <div key={l} className="border-r border-line px-5 py-5 first:pl-0 last:border-r-0 max-sm:border-b max-sm:px-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{l}</p>
            <p className="tnum mt-2 font-display text-3xl font-medium leading-none">{v}</p>
            <p className="mt-1.5 text-sm text-muted">{n}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <AccessCard key={`${t.status}-${t.plan}-${t.modules.join()}-${t.senderId}`} tenantId={tenantId} initial={t} onError={setError} />
        <CreditsCard tenantId={tenantId} credits={t.credits} messages={data.messages} onError={setError} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Users</h2>
        <PeopleTable users={data.users} run={run} onLink={(token, email) => setLink({ title: `Password reset for ${email}`, token, path: "/reset", note: "Send this to the person privately. It works once, expires in 24 hours, and signs them out everywhere when used." })} />
      </section>

      {data.invites.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Open invitations</h2>
          <Card className="divide-y divide-line">
            {data.invites.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="font-medium">{i.email}</p>
                  <p className="text-sm text-muted">{ROLE_LABELS[i.role as Role]} · expires {when.format(i.expiresAt)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => run(async () => { const r = await reissue({ inviteId: i.id }); setLink({ title: `New invitation for ${r.email}`, token: r.token, path: "/join", note: "The previous link no longer works. This one is valid for 72 hours and shown once." }); })}>
                  Issue a new link
                </Button>
              </div>
            ))}
          </Card>
        </section>
      )}

      <ActivityCard tenantId={tenantId} activity={data.activity} />
      <DangerZone tenantId={tenantId} name={t.name} onError={setError} />

      <Modal open={!!link} onClose={() => setLink(null)} title={link?.title ?? ""}>
        {link && <InviteLink token={link.token} path={link.path} note={link.note} />}
      </Modal>
    </>
  );
}

function Back() {
  return (
    <Link href="/admin/workspaces" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden="true" /> All workspaces
    </Link>
  );
}

function AccessCard({ tenantId, initial, onError }: { tenantId: Id<"tenants">; initial: Detail["tenant"]; onError: (m: string) => void }) {
  const update = useMutation(api.tenants.update);
  const [status, setStatus] = useState<Status>(initial.status);
  const [plan, setPlan] = useState<Plan>(initial.plan);
  const [modules, setModules] = useState<Module[]>(initial.modules);
  const [sender, setSender] = useState(initial.senderId ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [statusNote, setStatusNote] = useState("");
  async function changeStatus(next: Status) {
    const previous = status;
    if (next === previous) return;
    setStatus(next); setStatusNote(""); onError("");
    try {
      await update({ tenantId, status: next });
      setStatusNote(next === "suspended" ? "Suspended. Everyone in this workspace is signed out." : `Status set to ${next}.`);
    } catch (e) {
      setStatus(previous);
      onError(errorMessage(e));
    }
  }

  async function save() {
    setBusy(true); setSaved(false); onError("");
    try {
      await update({ tenantId, plan, modules, senderId: sender.trim() || undefined });
      setSaved(true);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const toggle = (m: Module) => setModules((c) => (c.includes(m) ? c.filter((x) => x !== m) : [...c, m]));

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Access and plan</h2>
      <Card className="space-y-4 p-5">
        <Field label="Status" htmlFor="ws-status" hint="Applies as soon as you choose it. Suspending signs everyone in this workspace out immediately and blocks agents.">
          <Select id="ws-status" value={status} onChange={(e) => changeStatus(e.target.value as Status)}>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
          {statusNote && <p role="status" className="mt-2 text-sm text-success">{statusNote}</p>}
        </Field>
        <Field label="Plan" htmlFor="ws-plan2">
          <Select id="ws-plan2" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
            {PLANS.map((p) => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Licensed modules</legend>
          <div className="flex gap-5">
            {(["tally", "sms"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={modules.includes(m)} onChange={() => toggle(m)} className="size-4 accent-primary" />
                {m === "sms" ? "Voter messaging" : "Results monitoring"}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="SMS sender ID" htmlFor="ws-sender" hint="3 to 11 letters or numbers, once approved by the network.">
          <Input id="ws-sender" value={sender} maxLength={11} onChange={(e) => setSender(e.target.value)} />
        </Field>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} loading={busy}>Save changes</Button>
          {saved && <span role="status" className="text-sm text-success">Saved</span>}
        </div>
      </Card>
    </section>
  );
}

function CreditsCard({ tenantId, credits, messages, onError }: { tenantId: Id<"tenants">; credits: number; messages: Record<string, number>; onError: (m: string) => void }) {
  const grant = useMutation(api.tenants.grantCredits);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function adjust(sign: 1 | -1) {
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) return onError("Enter a whole number of credits");
    setBusy(true); onError("");
    try {
      await grant({ tenantId, amount: sign * n });
      setAmount("");
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">SMS credit</h2>
      <Card className="space-y-4 p-5">
        <div>
          <p className="text-sm text-muted">Balance</p>
          <p className="tnum font-display text-5xl font-medium leading-none">{nf.format(credits)}</p>
          <p className="mt-1.5 text-sm text-muted">One credit is one SMS part to one recipient.</p>
        </div>
        <div className="flex gap-2">
          <Input aria-label="Credits to add or remove" inputMode="numeric" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          <Button onClick={() => adjust(1)} loading={busy}>Add</Button>
          <Button variant="secondary" onClick={() => adjust(-1)} disabled={busy}>Remove</Button>
        </div>
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-sm font-medium">Message requests</p>
          {Object.keys(messages).length === 0 ? (
            <p className="text-sm text-muted">None yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {Object.entries(messages).map(([s, n]) => (
                <li key={s} className="border border-line px-2.5 py-1 text-sm">
                  {s} <span className="tnum font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </section>
  );
}

function PeopleTable({ users, run, onLink }: { users: Detail["users"]; run: (fn: () => Promise<unknown>) => Promise<void>; onLink: (token: string, email: string) => void }) {
  const setStatus = useMutation(api.admin.setUserStatus);
  const signOut = useMutation(api.admin.signOutUser);
  const reset = useMutation(api.admin.createPasswordReset);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Last sign-in</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {users.map((u) => (
            <tr key={u.id} className={u.status === "suspended" ? "opacity-60" : ""}>
              <td className="px-5 py-3.5">
                <p className="font-medium">{u.name}</p>
                <p className="text-muted">{u.email}</p>
              </td>
              <td className="px-5 py-3.5">{ROLE_LABELS[u.role as Role]}</td>
              <td className="px-5 py-3.5"><Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status === "active" ? "Active" : "Suspended"}</Badge></td>
              <td className="px-5 py-3.5 text-muted">{u.lastLoginAt ? when.format(u.lastLoginAt) : "Never"}</td>
              <td className="px-5 py-3.5">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => run(async () => { const r = await reset({ userId: u.id as Id<"users"> }); onLink(r.token, r.email); })}>Reset password</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => signOut({ userId: u.id as Id<"users"> }))}>Sign out</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => setStatus({ userId: u.id as Id<"users">, status: u.status === "active" ? "suspended" : "active" }))}>
                    {u.status === "active" ? "Suspend" : "Reactivate"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ActivityCard({ tenantId, activity }: { tenantId: Id<"tenants">; activity: Detail["activity"] }) {
  const [check, setCheck] = useState(false);
  const chain = useQuery(api.audit.verifyChain, check ? { tenantId } : "skip");
  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Recent activity
        <span className="flex items-center gap-3 normal-case tracking-normal">
          {chain && (chain.valid ? (
            <Badge tone="success"><ShieldCheck className="mr-1 size-3.5" /> Chain intact · {chain.entries} entries</Badge>
          ) : (
            <Badge tone="danger"><ShieldAlert className="mr-1 size-3.5" /> Integrity check failed</Badge>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setCheck(true)}>Verify audit chain</Button>
        </span>
      </h2>
      <Card className="divide-y divide-line">
        {activity.length === 0 && <p className="p-5 text-sm text-muted">No activity yet.</p>}
        {activity.map((a) => (
          <div key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
            <p className="text-sm"><span className="font-medium">{describeAction(a.action)}</span> <span className="text-muted">· {a.actor}</span></p>
            <time className="tnum text-xs text-muted">{when.format(a.createdAt)}</time>
          </div>
        ))}
      </Card>
    </section>
  );
}

function DangerZone({ tenantId, name, onError }: { tenantId: Id<"tenants">; name: string; onError: (m: string) => void }) {
  const del = useMutation(api.admin.deleteWorkspace);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    setBusy(true); onError("");
    try {
      await del({ tenantId, confirmName: typed });
      setDone(true);
    } catch (e) {
      onError(errorMessage(e));
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border border-danger/40 p-5">
      <h2 className="text-sm font-semibold text-danger">Close this account</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Permanently deletes the workspace and everything in it: users, agents, results and photos, contacts and messages. Access stops at once and the rest is removed in the background. This cannot be undone.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>Delete workspace</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete this workspace?" description={done ? undefined : `Type "${name}" to confirm.`}>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm">Access has been stopped and deletion is running in the background. This page will show the workspace as gone shortly.</p>
            <Link href="/admin/workspaces" className="inline-flex h-10 items-center bg-primary px-4 text-sm font-medium text-primary-foreground">Back to workspaces</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <Input aria-label="Workspace name" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirm} loading={busy} disabled={typed.trim() !== name}>Delete permanently</Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
