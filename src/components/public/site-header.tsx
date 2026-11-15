import Link from "next/link";

/** Interim mark: four strokes and a gate, the universal tally. Replaced by the final logo in the brand step. */
export function TallyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className} aria-hidden="true">
      <rect width="34" height="34" fill="#ffffff" />
      <g stroke="#00246b" strokeWidth="3" strokeLinecap="square">
        <path d="M9 8v18M15 8v18M21 8v18M27 8v18" />
      </g>
      <path d="M5 22L31 12" stroke="#16653d" strokeWidth="3" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-desk text-desk-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <TallyMark className="size-8 shrink-0" />
          <span className="font-display text-[15px] font-semibold leading-tight">
            Campaign Management System
            <small className="mt-1 block font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-desk-muted">Election results</small>
          </span>
        </Link>
        <Link href="/aspirant" className="inline-flex h-10 items-center border border-desk-foreground px-4 text-sm font-semibold hover:bg-desk-foreground hover:text-desk">
          Are you an aspirant?
        </Link>
      </div>
    </header>
  );
}
