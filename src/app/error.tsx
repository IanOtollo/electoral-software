"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Shown when a page crashes. The reference lets support find the failure in server logs. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    document.title = "Something went wrong · Campaign Management System";
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-16 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Error 500</p>
      <h1 className="mt-3 font-display text-6xl font-semibold leading-none tracking-tight md:text-8xl">Something went wrong</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        We couldn&apos;t load this page. Your data is safe. Try again, and if it keeps happening, tell us the reference below.
      </p>
      {error.digest && <p className="tnum mt-3 text-sm text-subtle">Reference: {error.digest}</p>}
      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex h-12 items-center bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary-hover">
          Try again
        </button>
        <Link href="/" className="inline-flex h-12 items-center border border-line-strong px-6 text-base font-medium hover:bg-surface-2">
          Back to results
        </Link>
      </div>
    </main>
  );
}
