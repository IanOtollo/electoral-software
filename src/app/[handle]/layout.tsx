import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireServerToken } from "@/lib/server/auth";
import { WorkspaceShell } from "./workspace-shell";

export default async function WorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const token = await requireServerToken("workspace");
  const me = await fetchQuery(api.auth.me, {}, { token });
  if (!me) redirect("/login");
  if (me.role === "super_admin") redirect("/admin");
  // Someone else's address, or no such address: the same plain 404, so nothing is revealed about other campaigns.
  if (!me.tenant || me.tenant.slug !== handle) notFound();
  return (
    <WorkspaceShell me={me} handle={me.tenant.slug}>
      {children}
    </WorkspaceShell>
  );
}
