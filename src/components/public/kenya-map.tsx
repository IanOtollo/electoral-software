"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { counties } from "@/lib/geography";
import map from "@/data/kenya-map.json";

const nf = new Intl.NumberFormat("en-KE");
const [, , W, H] = map.viewBox;
const byCode = new Map(counties.map((c) => [c.code, c]));

/**
 * The 47 counties of Kenya. Every county is a real link (keyboard, screen reader and touch all work),
 * and the whole map reads without colour: the name and figures appear in text beside it.
 *
 * `coverage` (0 to 1 per county code) shades counties by the share of their stations that have
 * reported; with none supplied every county is neutral, which is the truth before polls open.
 */
export function KenyaMap({
  highlight,
  compact = false,
  coverage,
  className,
}: {
  highlight?: string;
  compact?: boolean;
  coverage?: Record<string, number>;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const shown = byCode.get(active ?? highlight ?? "");

  return (
    <figure className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Map of Kenya's 47 counties. Choose a county to open its page." className="h-auto w-full">
        {map.counties.map((c) => {
          const share = coverage?.[c.code];
          const isHighlight = c.code === highlight;
          return (
            <Link
              key={c.code}
              href={`/area/${c.code}`}
              aria-label={`${c.name}${isHighlight ? " (current)" : ""}`}
              onMouseEnter={() => setActive(c.code)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(c.code)}
              onBlur={() => setActive(null)}
              className="outline-none [&:focus-visible>path]:stroke-ink [&:focus-visible>path]:stroke-[3]"
            >
              <path
                d={c.d}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className={cn(
                  "cursor-pointer stroke-surface transition-[fill,stroke] duration-200",
                  isHighlight ? "fill-primary" : active === c.code ? "fill-info" : share === undefined ? "fill-line-strong/70" : "fill-success",
                )}
                style={share !== undefined && !isHighlight && active !== c.code ? { fillOpacity: 0.15 + 0.85 * Math.min(1, share) } : undefined}
                strokeWidth={compact ? 1 : 1.5}
              />
            </Link>
          );
        })}
      </svg>
      <figcaption className={cn("mt-3 min-h-[3.25rem] text-sm", compact && "min-h-0")}>
        {shown ? (
          <>
            <span className="block font-display text-lg font-semibold leading-tight">{shown.name}</span>
            {!compact && (
              <span className="tnum text-muted">
                {nf.format(shown.voters)} voters · {nf.format(shown.stations)} stations
              </span>
            )}
          </>
        ) : (
          <span className="text-muted">Hover or tap a county</span>
        )}
      </figcaption>
    </figure>
  );
}
