"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { UserPlus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { InviteLink } from "@/components/invite-link";
import { errorMessage, useMe } from "@/hooks/use-me";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, assignableRoles, type Role } from "../../../../convex/lib/permissions";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

export default function TeamPage() {
  const { me, can } = useMe();
  const users = useQuery(api.users.list, can("users:read") ? {} : "skip");
  const invites = useQuery(api.users.listInvites, can("users:manage") ? {} : "skip");
  const setRole = useMutation(api.users.setRole);
  const setStatus = useMutation(api.users.setStatus);
  const revoke = useMutation(api.users.revokeInvite);

  const [inviting, setInviting] = useState(false);
  const [rowError, setRowError] = useState("");

  if (!me) return null;
  if (!can("users:read")) return <EmptyState title="You do not have access to the team directory" />;

  const manage = can("users:manage");
  const grantable = assignableRoles(me.role as Role);

  async function run(fn: () => Promise<unknown>) {
    setRowError("");
    try {
      await fn();
    } catch (e) {
      setRowError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="People with access to this workspace and what each is allowed to do."
        actions={
          manage && (
            <Button onClick={() => setInviting(true)}>
              <UserPlus className="size-4" /> Invite person
            </Button>
          )
        }
      />

      {rowError && (
        <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {rowError}
        </div>
      )}

      <Card className="overflow-hidden">
        {users === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last sign-in</th>
                  {manage && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => {
                  const isSelf = u.id === me.id;
                  const editable = manage && !isSelf && grantable.includes(u.role as Role);
                  return (
                    <tr key={u.id} className={u.status === "suspended" ? "opacity-60" : undefined}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink">
                          {u.name} {isSelf && <span className="font-normal text-muted">(you)</span>}
                        </p>
                        <p className="text-muted">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {editable ? (
                          <Select
                            aria-label={`Role for ${u.name}`}
                            value={u.role}
                            className="h-9 w-52"
                            onChange={(e) => run(() => setRole({ userId: u.id as Id<"users">, role: e.target.value as Role }))}
                          >
                            {grantable.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          ROLE_LABELS[u.role as Role]
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status === "active" ? "Active" : "Suspended"}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{u.lastLoginAt ? dateFmt.format(u.lastLoginAt) : "Never"}</td>
                      {manage && (
                        <td className="px-5 py-3.5 text-right">
                          {editable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                run(() => setStatus({ userId: u.id as Id<"users">, status: u.status === "active" ? "suspended" : "active" }))
                              }
                            >
                              {u.status === "active" ? "Suspend" : "Reactivate"}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {manage && invites && invites.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">Pending invitations</h2>
          <Card className="divide-y divide-line">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-sm text-muted">
                    {ROLE_LABELS[i.role as Role]} · expires {dateFmt.format(i.expiresAt)}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => run(() => revoke({ inviteId: i.id as Id<"invites"> }))}>
                  Withdraw
                </Button>
              </div>
            ))}
          </Card>
        </>
      )}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-muted">What each role can do</h2>
      <Card className="divide-y divide-line">
        {grantable.map((r) => (
          <div key={r} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[14rem_1fr]">
            <p className="text-sm font-medium">{ROLE_LABELS[r]}</p>
            <p className="text-sm text-muted">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </Card>

      <InviteModal open={inviting} onClose={() => setInviting(false)} roles={grantable} />
    </>
  );
}

function InviteModal({ open, onClose, roles }: { open: boolean; onClose: () => void; roles: Role[] }) {
  const invite = useMutation(api.users.invite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setEmail("");
    setRole("viewer");
    setToken(null);
    setError("");
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await invite({ email, role });
      setToken(res.token);
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
      title={token ? "Invitation ready" : "Invite a person"}
      description={token ? undefined : "They will create their own password from a private link."}
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
          <Field label="Email address" htmlFor="invite-email">
            <Input id="invite-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint={ROLE_DESCRIPTIONS[role]}>
            <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create invitation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
