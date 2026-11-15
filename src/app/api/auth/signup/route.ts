import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { SESSION_COOKIE, convexServer, cookieOptions, isSameOrigin, serverSecret, signSession } from "@/lib/server/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (k: string) => (typeof b?.[k] === "string" ? (b[k] as string) : "");
  if (!b || !str("email") || !str("password") || !str("name") || !str("campaignName")) {
    return NextResponse.json({ error: "Please fill in every field" }, { status: 400 });
  }

  // Behind a proxy the first x-forwarded-for hop is the client; used only for rate limiting.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const result = await convexServer().mutation(api.signup.register, {
    serverSecret: serverSecret(),
    ip,
    userAgent: req.headers.get("user-agent")?.slice(0, 200),
    name: str("name"),
    email: str("email"),
    password: str("password"),
    campaignName: str("campaignName"),
    acceptedTerms: b.acceptedTerms === true,
  });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });

  const res = NextResponse.json({ redirect: `/${result.slug}/campaign` });
  res.cookies.set(SESSION_COOKIE, await signSession(result.sid, result.expiresAt), cookieOptions(result.expiresAt));
  return res;
}
