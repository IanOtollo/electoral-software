import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { TallyMark } from "@/components/public/site-header";

// Not linked from anywhere public, and kept out of search results.
export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-var(--banner-h))] items-center justify-center bg-desk px-6 py-12 text-desk-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <TallyMark className="size-9 shrink-0" />
          <div>
            <p className="font-display text-lg font-semibold leading-tight">Administration</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-desk-muted">Authorised staff only</p>
          </div>
        </div>
        <div className="border border-desk-2 bg-background p-8 text-ink">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Activity on this console is recorded in a tamper-evident audit log.</p>
          <Suspense>
            <LoginForm scope="admin" home="/admin" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
