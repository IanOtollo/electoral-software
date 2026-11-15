"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { InviteLink } from "@/components/invite-link";
import { errorMessage } from "@/hooks/use-me";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const PLANS = ["starter", "constituency", "county", "national"] as const;
type Plan = (typeof PLANS)[number];
type Module = "sms" | "tally";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function WorkspacesPage() {
  const tenants = useQuery(api.tenants.list);
  const update = useMutation(api.tenants.update);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(tenantId: Id<"tenants">, status: "trial" | "active" | "suspended") {
    setError("");
    try {
      await update({ tenantId, status });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Workspaces"
        description="Each campaign operates in its own isolated workspace. You provision them here and cannot see their voter data or messages."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New workspace
          </Button>
        }
      />

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {tenants === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState
            title="No workspaces yet"
            description="Create the first workspace and send its administrator an invitation."
            action={<Button onClick={() => setCreating(true)}>New workspace</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Workspace</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Modules</th>
                  <th className="px-5 py-3 font-medium">Users</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tenants.map((t) => (
                  <tr key={t._id}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="font-mono text-xs text-muted">{t.slug}</p>
                    </td>
                    <td className="px-5 py-3.5 capitalize">{t.plan}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        {t.modules.map((m) => (
                          <Badge key={m} tone="info">
                            {m === "sms" ? "SMS" : "Results"}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="tnum px-5 py-3.5">{t.userCount}</td>
                    <td className="px-5 py-3.5">
                      <Select
                        aria-label={`Status for ${t.name}`}
                        value={t.status}
                        className="h-9 w-32"
                        onChange={(e) => setStatus(t._id, e.target.value as "trial" | "active" | "suspended")}
                      >
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{dateFmt.format(t.createdAt)}</td>
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
  const [senderId, setSenderId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setPlan("county");
    setModules(["sms", "tally"]);
    setContactEmail("");
    setAdminEmail("");
    setSenderId("");
    setToken(null);
    setError("");
    onClose();
  }

  const toggle = (m: Module) => setModules((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (modules.length === 0) return setError("License at least one module");
    setBusy(true);
    try {
      const res = await create({
        name,
        slug,
        plan,
        modules,
        contactEmail,
        adminEmail,
        senderId: senderId.trim() || undefined,
      });
      setToken(res.inviteToken);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={token ? "Workspace created" : "New workspace"}
      description={token ? `Send this link to ${adminEmail} so they can set a password and become the workspace administrator.` : undefined}
    >
      {token ? (
        <InviteLink token={token} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}
          <Field label="Campaign name" htmlFor="ws-name">
            <Input
              id="ws-name"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Workspace slug" htmlFor="ws-slug" hint="Lower-case letters, numbers and hyphens.">
            <Input
              id="ws-slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan" htmlFor="ws-plan">
              <Select id="ws-plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)} className="capitalize">
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="SMS sender ID" htmlFor="ws-sender" hint="Optional, 3 to 11 characters.">
              <Input id="ws-sender" value={senderId} maxLength={11} onChange={(e) => setSenderId(e.target.value)} />
            </Field>
          </div>
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
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create workspace
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
