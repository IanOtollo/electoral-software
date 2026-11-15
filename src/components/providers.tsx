"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "./ThemeProvider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
      <ConvexProviderWithAuth client={convex} useAuth={useCookieAuth}>
        {children}
      </ConvexProviderWithAuth>
    </ThemeProvider>
  );
}
