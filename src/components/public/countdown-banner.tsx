"use client";

import { useEffect, useState } from "react";
import { NEXT_GENERAL_ELECTION } from "@/lib/election";

const target = Date.parse(NEXT_GENERAL_ELECTION.startsAt);
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Permanent: pinned to the top of every page, cannot be dismissed, and never
 * blocks anything underneath (the app offsets its own sticky bars by --banner-h).
 */
export function CountdownBanner() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? null : Math.max(0, target - now);

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex h-[var(--banner-h)] items-center justify-center gap-x-6 overflow-hidden whitespace-nowrap border-b border-line bg-surface-2 px-4 text-sm text-ink"
    >
      <span className="hidden font-semibold sm:inline">
        {NEXT_GENERAL_ELECTION.label} · {NEXT_GENERAL_ELECTION.dateLabel}
      </span>
      <span className="tnum font-display text-base" aria-label="Time until the next general election">
        {left === null ? (
          <span className="invisible">000 days 00 hrs 00 min 00 sec</span>
        ) : left === 0 ? (
          "Voting is under way"
        ) : (
          <>
            <b className="font-semibold">{Math.floor(left / 864e5)}</b> days <b className="font-semibold">{pad(Math.floor(left / 36e5) % 24)}</b> hrs{" "}
            <b className="font-semibold">{pad(Math.floor(left / 6e4) % 60)}</b> min <b className="font-semibold">{pad(Math.floor(left / 1e3) % 60)}</b> sec
          </>
        )}
      </span>
    </div>
  );
}
