"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { hasPermission, type Permission, type Role } from "../../convex/lib/permissions";

export type Me = NonNullable<FunctionReturnType<typeof api.auth.me>>;

/** The signed-in user as loaded on the server, so the first paint already has it. */
const InitialMe = createContext<Me | null>(null);
export function InitialMeProvider({ me, children }: { me: Me | null; children: ReactNode }) {
  return createElement(InitialMe.Provider, { value: me }, children);
}

/** undefined = loading, null = signed out. UI gating only; Convex re-checks every call. */
export function useMe() {
  const initial = useContext(InitialMe);
  const live = useQuery(api.auth.me);
  // Until the live subscription connects, show what the server already knew.
  const me = live === undefined ? (initial ?? undefined) : live;
  const can = (p: Permission) => !!me && hasPermission(me.role as Role, p);
  return { me, can };
}

/** "/asha-otieno": the signed-in person's own workspace address, for links inside pages. */
export function useBase() {
  const { me } = useMe();
  return me?.tenant ? `/${me.tenant.slug}` : "";
}

export function errorMessage(e: unknown): string {
  const data = (e as { data?: unknown })?.data;
  if (data && typeof data === "object" && "message" in data) return String((data as { message: unknown }).message);
  if (typeof data === "string") return data;
  return "Something went wrong. Please try again.";
}
