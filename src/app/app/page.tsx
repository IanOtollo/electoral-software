import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireServerToken } from "@/lib/server/auth";

/** Old bookmark or generic entry point: send the signed-in person to their own workspace. */
export default async function AppIndex() {
  const token = await requireServerToken("workspace");
  const me = await fetchQuery(api.auth.me, {}, { token });
  if (!me) redirect("/login");
  redirect(me.role === "super_admin" ? "/admin" : me.tenant ? `/${me.tenant.slug}` : "/login");
}
