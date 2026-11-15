"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { InviteLink } from "@/components/invite-link";
import { errorMessage } from "@/hooks/use-me";

const nf = new Intl.NumberFormat("en-KE");
const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const PLANS = ["starter", "constituency", "county", "national"] as const;
type Plan = (typeof PLANS)[number];
type Module = "sms" | "tally";
const TONE = { active: "success", trial: "info", suspended: "danger" } as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function WorkspacesPage() {
  const rows = useQuery(api.admin.workspaces);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!status || r.status === status) && (!needle || r.name.toLowerCase().includes(needle) || r.slug.includes(needle)));
  }, [rows, q, status]);

  return (
    <>
      <PageHeader
        kicker="Platform"
        title="Workspaces"
        description="Every campaign on the platform. Open one to manage its plan, credits, users and access."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New workspace
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input aria-label="Search workspaces" placeholder="Search by name or address" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {rows === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No workspaces yet" description="Aspirants appear here as they sign up, or create one yourself." action={<Button onClick={() => setCreating(true)}>New workspace</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState title="Nothing matches" description="Try a different name or clear the filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Workspace</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Users</th>
                  <th className="px-5 py-3 text-right font-medium">Agents</th>
                  <th className="px-5 py-3 text-right font-medium">Stations in</th>
                  <th className="px-5 py-3 text-right font-medium">Flagged</th>
                  <th className="px-5 py-3 text-right font-medium">SMS credit</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-2">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/workspaces/${r.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                        {r.name}
                      </Link>
                      <p className="font-mono text-xs text-muted">/{r.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={TONE[r.status]}>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge>
                    </td>
                    <td className="tnum px-5 py-3.5 text-right">{r.users}</td>
                    <td className="tnum px-5 py-3.5 text-right">
                      {r.agentsActive}
                      <span className="text-muted"> / {r.agents}</span>
                    </td>
                    <td className="tnum px-5 py-3.5 text-right">
                      {nf.format(r.stationsReported)}
                      <span className="text-muted"> of {nf.format(r.stationsAssigned)}</span>
                    </td>
                    <td className={`tnum px-5 py-3.5 text-right ${r.flagged ? "font-semibold text-danger" : ""}`}>{r.flagged}</td>
                    <td className="tnum px-5 py-3.5 text-right">{nf.format(r.credits)}</td>
                    <td className="px-5 py-3.5 text-muted">{dateFmt.format(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateWorkspaceModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useMutation(api.tenants.create);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [plan, setPlan] = useState<Plan>("county");
  const [modules, setModules] = useState<Module[]>(["sms", "tally"]);
  const [contactEmail, setContactEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setName(""); setSlug(""); setSlugTouched(false); setPlan("county"); setModules(["sms", "tally"]);
    setContactEmail(""); setAdminEmail(""); setToken(null); setError("");
    onClose();
  }
  const toggle = (m: Module) => setModules((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (modules.length === 0) return setError("License at least one module");
    setBusy(true);
    try {
      const res = await create({ name, slug, plan, modules, contactEmail, adminEmail });
      setToken(res.inviteToken);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={token ? "Workspace created" : "New workspace"} description={token ? `Send this link to ${adminEmail} so they can set a password and become the workspace administrator.` : undefined}>
      {token ? (
        <InviteLink token={token} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}
          <Field label="Campaign name" htmlFor="ws-name">
            <Input id="ws-name" required autoFocus value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
          </Field>
          <Field label="Workspace address" htmlFor="ws-slug" hint="The workspace lives at /this-name. Lower-case letters, numbers and hyphens.">
            <Input id="ws-slug" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
          </Field>
          <Field label="Plan" htmlFor="ws-plan">
            <Select id="ws-plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Licensed modules</legend>
            <div className="flex gap-4">
              {(["sms", "tally"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={modules.includes(m)} onChange={() => toggle(m)} className="size-4 accent-primary" />
                  {m === "sms" ? "Voter messaging" : "Results monitoring"}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Organisation contact email" htmlFor="ws-contact">
            <Input id="ws-contact" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </Field>
          <Field label="Administrator email" htmlFor="ws-admin" hint="This person will own the workspace.">
            <Input id="ws-admin" type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" loading={busy}>Create workspace</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
