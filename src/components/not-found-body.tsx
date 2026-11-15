import Link from "next/link";

/** Centred in the window, nothing else on the page. */
export function NotFoundBody() {
  return (
    <main className="flex min-h-[calc(100vh-var(--banner-h))] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Error 404</p>
      <h1 className="mt-4 font-display text-6xl font-semibold leading-none tracking-tight md:text-8xl">Page not found</h1>
      <p className="mt-6 max-w-md text-lg text-muted">That address doesn&apos;t match any page here. It may have been mistyped, or the link may be out of date.</p>
      <Link href="/" className="mt-10 inline-flex h-12 items-center bg-primary px-8 text-base font-medium text-primary-foreground hover:bg-primary-hover">
        Back home
      </Link>
    </main>
  );
}
