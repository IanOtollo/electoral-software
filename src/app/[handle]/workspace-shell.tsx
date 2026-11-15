"use client";

import type { ReactNode } from "react";
import { Activity, BookUser, LayoutDashboard, MessageSquareText, Megaphone, ScrollText, Smartphone, UserCog, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { InitialMeProvider, type Me } from "@/hooks/use-me";

function navFor(base: string): NavItem[] {
  return [
    { label: "Overview", href: base, icon: LayoutDashboard },
    { label: "Live tally", href: `${base}/tally`, icon: Activity, permission: "tally:read", module: "tally" },
    { label: "Agents", href: `${base}/agents`, icon: Smartphone, permission: "tally:read", module: "tally" },
    { label: "Campaign", href: `${base}/campaign`, icon: Megaphone, permission: "tally:read" },
    { label: "Contacts", href: `${base}/contacts`, icon: BookUser, permission: "voters:read", module: "sms" },
    { label: "Messages", href: `${base}/messages`, icon: MessageSquareText, permission: "sms:read", module: "sms" },
    { label: "Team", href: `${base}/team`, icon: Users, permission: "users:read" },
    { label: "Audit log", href: `${base}/audit`, icon: ScrollText, permission: "audit:read" },
    { label: "Account", href: `${base}/account`, icon: UserCog },
  ];
}

export function WorkspaceShell({ me, handle, children }: { me: Me | null; handle: string; children: ReactNode }) {
  return (
    <InitialMeProvider me={me}>
      <AppShell nav={navFor(`/${handle}`)} area="workspace">
        {children}
      </AppShell>
    </InitialMeProvider>
  );
}
