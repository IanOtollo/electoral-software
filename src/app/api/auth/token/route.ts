import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { SESSION_COOKIE, convexServer, currentSession, mintConvexToken, serverSecret } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** Browser calls this to get a short-lived Convex token; the session cookie itself never reaches JS. */
export async function GET() {
  const noStore = { "Cache-Control": "no-store" };
  const session = await currentSession();
  if (!session) return NextResponse.json({ token: null }, { status: 401, headers: noStore });

  const status = await convexServer().query(api.auth.sessionStatus, {
    serverSecret: serverSecret(),
    sid: session.sid,
  });
  if (!status) {
    const res = NextResponse.json({ token: null }, { status: 401, headers: noStore });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  return NextResponse.json({ token: await mintConvexToken(session.sid, status.userId) }, { headers: noStore });
}
