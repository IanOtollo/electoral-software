import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { requireServerToken } from "@/lib/server/auth";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const token = await requireServerToken("admin");
  const me = await fetchQuery(api.auth.me, {}, { token });
  // Anyone who is not a platform administrator, including a signed-in aspirant, gets a plain 404:
  // the console does not reveal that it exists.
  if (!me || me.role !== "super_admin") notFound();
  return <AdminShell me={me}>{children}</AdminShell>;
}
