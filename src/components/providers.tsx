"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "./ThemeProvider";

// If the backend address is missing (for example a preview build without its variables), the public pages
// still build and work; only the parts that need the backend are unavailable. A missing address is reported
// loudly in the browser console instead of failing the whole deployment.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
if (!convex && typeof window !== "undefined") console.error("NEXT_PUBLIC_CONVEX_URL is not set. Sign-in and workspaces are unavailable.");

/**
 * The browser never sees the session cookie (httpOnly). It asks our server for a
 * short-lived Convex token, and Convex re-fetches it before it expires.
 */
function useCookieAuth() {
  const [state, setState] = useState({ isLoading: true, isAuthenticated: false });

  useEffect(() => {
    let active = true;
    fetch("/api/auth/token", { cache: "no-store" })
      .then((r) => active && setState({ isLoading: false, isAuthenticated: r.ok }))
      .catch(() => active && setState({ isLoading: false, isAuthenticated: false }));
    return () => {
      active = false;
    };
  }, []);

  const fetchAccessToken = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/token", { cache: "no-store" });
      if (!r.ok) return null;
      return ((await r.json()) as { token: string | null }).token;
    } catch {
      return null;
    }
  }, []);

  return useMemo(() => ({ ...state, fetchAccessToken }), [state, fetchAccessToken]);
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {convex ? (
        <ConvexProviderWithAuth client={convex} useAuth={useCookieAuth}>
          {children}
        </ConvexProviderWithAuth>
      ) : (
        children
      )}
    </ThemeProvider>
  );
}
