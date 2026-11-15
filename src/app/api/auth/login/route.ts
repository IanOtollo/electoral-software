import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import {
  SESSION_COOKIE,
  convexServer,
  cookieOptions,
  isSameOrigin,
  serverSecret,
  signSession,
} from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown; scope?: unknown } | null;
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const result = await convexServer().mutation(api.auth.login, {
    serverSecret: serverSecret(),
    email: body.email,
    password: body.password,
    userAgent: req.headers.get("user-agent")?.slice(0, 200),
    scope: body.scope === "admin" ? "admin" : "campaign",
  });

  if (!result.ok) {
    if (result.reason === "locked") {
      const minutes = Math.ceil(result.retryAfterMs / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  const res = NextResponse.json({
    redirect: result.role === "super_admin" ? "/admin" : "/app",
  });
  res.cookies.set(SESSION_COOKIE, await signSession(result.sid, result.expiresAt), cookieOptions(result.expiresAt));
  return res;
}
