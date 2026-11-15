import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { SESSION_COOKIE, convexServer, currentSession, isSameOrigin, serverSecret } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await currentSession();
  if (session) {
    // Revoke server-side first so a copied cookie is dead too, not just deleted locally.
    await convexServer().mutation(api.auth.logout, { serverSecret: serverSecret(), sid: session.sid });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
