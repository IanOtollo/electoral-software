"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Search } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { InviteLink } from "@/components/invite-link";
import { errorMessage } from "@/hooks/use-me";
import { ROLE_LABELS, ROLES, type Role } from "../../../../../convex/lib/permissions";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

export default function UsersPage() {
  const rows = useQuery(api.admin.users);
  const setStatus = useMutation(api.admin.setUserStatus);
  const signOut = useMutation(api.admin.signOutUser);
  const reset = useMutation(api.admin.createPasswordReset);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus2] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState<{ token: string; email: string } | null>(null);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (u) => (!role || u.role === role) && (!status || u.status === status) && (!needle || [u.name, u.email, u.workspace].some((s) => s.toLowerCase().includes(needle))),
    );
  }, [rows, q, role, status]);

  async function run(fn: () => Promise<unknown>, done?: string) {
    setError(""); setNotice("");
    try {
      await fn();
      if (done) setNotice(done);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader kicker="Platform" title="Users" description="Everyone with an account, across every workspace. Suspend someone, end their sessions, or issue a password reset link." />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_13rem_11rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <Input aria-label="Search users" placeholder="Search name, email or workspace" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </Select>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus2(e.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {error && <div role="alert" className="mb-4 border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</div>}
      {notice && <div role="status" className="mb-4 border border-success/40 bg-success-soft px-4 py-3 text-sm text-success">{notice}</div>}

      <Card className="overflow-hidden">
        {rows === undefined ? (
          <div className="space-y-3 p-5"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : shown.length === 0 ? (
          <EmptyState title="No one matches" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Person</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Workspace</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Last sign-in</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((u) => {
                  const protectedAccount = u.role === "super_admin";
                  return (
                    <tr key={u.id} className={u.status === "suspended" ? "opacity-60" : ""}>
                      <td className="px-5 py-3.5"><p className="font-medium">{u.name}</p><p className="text-muted">{u.email}</p></td>
                      <td className="px-5 py-3.5">{ROLE_LABELS[u.role as Role]}</td>
                      <td className="px-5 py-3.5">
                        {u.workspaceId ? <Link href={`/admin/workspaces/${u.workspaceId}`} className="underline-offset-4 hover:underline">{u.workspace}</Link> : <span className="text-muted">Platform</span>}
                      </td>
                      <td className="px-5 py-3.5"><Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status === "active" ? "Active" : "Suspended"}</Badge></td>
                      <td className="px-5 py-3.5 text-muted">{u.lastLoginAt ? when.format(u.lastLoginAt) : "Never"}</td>
                      <td className="px-5 py-3.5">
                        {!protectedAccount && (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button size="sm" variant="ghost" onClick={() => run(async () => { const r = await reset({ userId: u.id as Id<"users"> }); setLink(r); })}>Reset password</Button>
                            <Button size="sm" variant="ghost" onClick={() => run(async () => { const r = await signOut({ userId: u.id as Id<"users"> }); setNotice(`Ended ${r.sessions} session${r.sessions === 1 ? "" : "s"}.`); })}>Sign out</Button>
                            <Button size="sm" variant="ghost" onClick={() => run(() => setStatus({ userId: u.id as Id<"users">, status: u.status === "active" ? "suspended" : "active" }))}>
                              {u.status === "active" ? "Suspend" : "Reactivate"}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {rows && rows.length >= 500 && <p className="mt-3 text-sm text-muted">Showing the 500 most recent accounts. Use search to find others.</p>}

      <Modal open={!!link} onClose={() => setLink(null)} title={link ? `Password reset for ${link.email}` : ""}>
        {link && <InviteLink token={link.token} path="/reset" note="Send this to the person privately. It works once, expires in 24 hours, and signs them out everywhere when used." />}
      </Modal>
    </>
  );
}
