"use client";

import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { InitialMeProvider, type Me } from "@/hooks/use-me";

const NAV: NavItem[] = [{ label: "Workspaces", href: "/admin", icon: Building2, permission: "tenants:manage" }];

export function AdminShell({ me, children }: { me: Me | null; children: ReactNode }) {
  return (
    <InitialMeProvider me={me}>
      <AppShell nav={NAV} area="admin" requireRole="super_admin">
        {children}
      </AppShell>
    </InitialMeProvider>
  );
}
