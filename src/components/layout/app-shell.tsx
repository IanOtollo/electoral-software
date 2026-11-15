"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Skeleton } from "@/components/ui/primitives";
import { FadeScroll } from "@/components/ui/fade-scroll";
import { useMe } from "@/hooks/use-me";
import { ROLE_LABELS, type Permission, type Role } from "../../../convex/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the user holds this permission. */
  permission?: Permission;
  /** Hidden unless the workspace is licensed for this module. */
  module?: "sms" | "tally";
};

export function AppShell({
  nav,
  area,
  requireRole,
  children,
}: {
  nav: NavItem[];
  area: "workspace" | "admin";
  /** Only this role may enter the area; anyone else is sent to their own home. */
  requireRole?: Role;
  children: ReactNode;
}) {
  const { me, can } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (me === null) router.replace(area === "admin" ? "/admin/login" : "/login");
    else if (me && requireRole && me.role !== requireRole) router.replace("/app");
    else if (me && area === "workspace" && me.role === "super_admin") router.replace("/admin");
  }, [me, requireRole, area, router]);

  if (!me || (requireRole && me.role !== requireRole)) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 border-r border-line bg-surface p-4 md:block">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-64 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  const items = nav.filter(
    (n) => (!n.permission || can(n.permission)) && (!n.module || me.tenant?.modules.includes(n.module)),
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Logo />
      </div>
      <FadeScroll className="flex-1">
      <nav aria-label="Primary" className="space-y-0.5 p-3">
        {items.map((item) => {
          const active = item.href === pathname || (item.href.split("/").length > 2 && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      </FadeScroll>
      <div className="border-t border-line p-3">
        <UserMenu name={me.name} email={me.email} role={me.role as Role} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-[var(--banner-h)] hidden h-[calc(100vh-var(--banner-h))] w-64 shrink-0 border-r border-line bg-surface md:block">{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-[var(--banner-h)] z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-muted hover:bg-surface-2 md:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{me.tenant?.name ?? "Platform administration"}</p>
            <p className="truncate text-xs text-muted">{area === "admin" ? "All workspaces" : ROLE_LABELS[me.role as Role]}</p>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 top-[var(--banner-h)] z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-[var(--banner-h)] w-72 bg-surface shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted hover:bg-surface-2"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle colour theme"
      className="rounded-md p-2 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}

function UserMenu({ name, email, role }: { name: string; email: string; role: Role }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }
  return (
    <div className="flex items-center gap-3 rounded-md p-2">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-ink" aria-hidden>
        {name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-muted" title={email}>
          {ROLE_LABELS[role]}
        </p>
      </div>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        aria-label="Sign out"
        title="Sign out"
        className="rounded-md p-2 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
