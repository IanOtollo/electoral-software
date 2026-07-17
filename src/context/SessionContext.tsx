"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getSessionToken } from "../lib/session";
import { Id } from "../../convex/_generated/dataModel";

type SessionUser = {
  id: Id<"users">;
  role: string;
  tenantId?: Id<"tenants">;
  email?: string;
  name: string;
  tenant: {
    id: Id<"tenants">;
    name: string;
    licensedModules: ("sms" | "tally")[];
    planTier: string;
    billingStatus: string;
    senderId?: string;
  } | null;
};

const SessionContext = createContext<{
  token: string | null;
  user: SessionUser | null | undefined;
  isLoading: boolean;
}>({ token: null, user: null, isLoading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const token = getSessionToken();
  const user = useQuery(api.auth_functions.getSessionUser, { token: token ?? undefined });

  return (
    <SessionContext.Provider
      value={{ token, user: user ?? null, isLoading: user === undefined }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
