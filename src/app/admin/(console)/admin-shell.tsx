"use client";

import type { ReactNode } from "react";
import { Building2, LayoutDashboard, MessageSquareText, ScrollText, Settings, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { InitialMeProvider, type Me } from "@/hooks/use-me";

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, permission: "tenants:manage" },
  { label: "Workspaces", href: "/admin/workspaces", icon: Building2, permission: "tenants:manage" },
  { label: "Users", href: "/admin/users", icon: Users, permission: "tenants:manage" },
  { label: "Message approvals", href: "/admin/messages", icon: MessageSquareText, permission: "sms:review" },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText, permission: "audit:read" },
  { label: "Settings", href: "/admin/settings", icon: Settings, permission: "tenants:manage" },
];

export function AdminShell({ me, children }: { me: Me | null; children: ReactNode }) {
  return (
    <InitialMeProvider me={me}>
      <AppShell nav={NAV} area="admin" requireRole="super_admin">
        {children}
      </AppShell>
    </InitialMeProvider>
  );
}
