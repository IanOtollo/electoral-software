import "server-only";
import { SignJWT, jwtVerify, importPKCS8 } from "jose";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";

export const SESSION_COOKIE = "cms_session";
const CONVEX_TOKEN_TTL_SECONDS = 10 * 60;

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

const sessionKey = () => new TextEncoder().encode(need("SESSION_SECRET"));

export const serverSecret = () => need("SERVER_SECRET");

export function convexServer() {
  return new ConvexHttpClient(need("NEXT_PUBLIC_CONVEX_URL"));
}

/** Signed, httpOnly cookie payload. Carries only the opaque session id. */
export async function signSession(sid: string, expiresAt: number) {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(sessionKey());
}

export async function verifySession(token: string | undefined): Promise<{ sid: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    return typeof payload.sid === "string" ? { sid: payload.sid } : null;
  } catch {
    return null;
  }
}

export async function currentSession() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Mint a short-lived RS256 token Convex accepts (see convex/auth.config.ts). */
export async function mintConvexToken(sid: string, userId: string) {
  const pem = Buffer.from(need("JWT_PRIVATE_KEY"), "base64").toString();
  const key = await importPKCS8(pem, "RS256");
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: "RS256", kid: "cms-1" })
    .setSubject(userId)
    .setIssuer("https://cms.internal")
    .setAudience("cms-web")
    .setIssuedAt()
    .setExpirationTime(`${CONVEX_TOKEN_TTL_SECONDS}s`)
    .sign(key);
}

export const cookieOptions = (expiresAt: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(expiresAt),
});

/** CSRF defence for cookie-authenticated POSTs: the Origin must match this host. */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/** Convex token for the signed-in user, or null. Lets server components load data before the page is sent. */
export async function serverToken(): Promise<string | null> {
  const session = await currentSession();
  if (!session) return null;
  const status = await convexServer().query(api.auth.sessionStatus, { serverSecret: serverSecret(), sid: session.sid });
  return status ? await mintConvexToken(session.sid, status.userId) : null;
}

/** Like serverToken, but sends signed-out visitors to the right sign-in page. */
export async function requireServerToken(area: "workspace" | "admin" = "workspace"): Promise<string> {
  const token = await serverToken();
  if (!token) redirect(area === "admin" ? "/admin/login" : "/aspirant?mode=signin");
  return token;
}
