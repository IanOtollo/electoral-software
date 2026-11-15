import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Coarse gate. A workspace lives at /<name>, so instead of listing protected paths we
 * list the PUBLIC ones: anything else needs a valid signed session cookie, and a
 * signed-out visitor is sent to sign in without learning whether the address exists.
 * Which workspace you may open is decided on the server (src/app/[handle]/layout.tsx)
 * and, underneath, by Convex, which refuses another campaign's data regardless of the URL.
 *
 * The /admin console is a separate channel with its own sign-in page, and if
 * ADMIN_ALLOWED_IPS is set (comma-separated) every other address gets a plain 404.
 */
const PUBLIC_PREFIXES = new Set(["", "login", "aspirant", "area", "legal", "agent", "join", "reset", "design"]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const first = path.split("/")[1] ?? "";
  const isAdmin = first === "admin";

  if (isAdmin) {
    const allow = process.env.ADMIN_ALLOWED_IPS?.split(",").map((s) => s.trim()).filter(Boolean);
    if (allow?.length) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
      if (!allow.includes(ip)) return new NextResponse(null, { status: 404 });
    }
    if (path === "/admin/login") return NextResponse.next();
  } else if (PUBLIC_PREFIXES.has(first)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cms_session")?.value;
  let valid = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), { algorithms: ["HS256"] });
      valid = true;
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    let res: NextResponse;
    if (isAdmin) {
      // The admin's address is /admin itself: signed out, it simply shows the admin sign-in there.
      // Deeper admin paths are sent back to /admin.
      res = path === "/admin" ? NextResponse.rewrite(new URL("/admin/login", request.url)) : NextResponse.redirect(new URL("/admin", request.url));
    } else {
      const url = new URL("/aspirant", request.url);
      url.searchParams.set("mode", "signin");
      url.searchParams.set("next", path);
      res = NextResponse.redirect(url);
    }
    if (token) res.cookies.delete("cms_session");
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Everything except framework files, API routes and anything with a file extension.
  matcher: ["/((?!_next/|api/|favicon\\.ico|.*\\..*).*)"],
};
