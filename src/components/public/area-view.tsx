import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Area } from "@/lib/geography";
import { source, registerUpdate } from "@/lib/geography";
import { NEXT_GENERAL_ELECTION } from "@/lib/election";
import { INDEPENDENCE_STATEMENT } from "@/lib/legal-config";
import { AreaPicker } from "./area-picker";
import { Reveal } from "@/components/motion/motion";
import { CoverageWall } from "./coverage-wall";
import { KenyaMap } from "./kenya-map";

const nf = new Intl.NumberFormat("en-KE");
const LEVEL = { national: "National", county: "County", constituency: "Constituency", ward: "Ward" } as const;

function Figure({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="border-r border-line px-6 py-5 first:pl-0 last:border-r-0 max-md:border-b max-md:px-0 max-md:last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="tnum mt-2.5 font-display text-4xl font-medium leading-none tracking-tight">{value}</p>
      {note && <p className="mt-1.5 text-sm text-muted">{note}</p>}
    </div>
  );
}

export function AreaView({ area }: { area: Area }) {
  const code = area.code || undefined;
  return (
    <>
      <section className="border-b-2 border-desk pb-8">
        <div className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
          {area.crumbs.map((c) => (
            <span key={c.href} className="flex items-center gap-1">
              <Link href={c.href} className="hover:text-ink hover:underline">
                {c.name}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </span>
          ))}
          <span className="font-medium text-ink">{area.name}</span>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{LEVEL[area.level]}</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          {area.level === "national" ? "Find your area" : area.name}
        </h1>
        {area.level === "national" && (
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Choose a county, constituency or ward to follow polling-station results and how much of that area has reported.
          </p>
        )}
        <div className="mt-8">
          <AreaPicker current={code} />
        </div>
      </section>

      <section className="grid border-b border-line md:grid-cols-4" aria-label="Area summary">
        <Figure label="Registered voters" value={nf.format(area.voters)} note="IEBC 2022 register" />
        <Figure label="Polling stations" value={nf.format(area.stations)} />
        {area.counts.slice(0, 1).map((c) => (
          <Figure key={c.label} label={c.label} value={nf.format(c.value)} />
        ))}
        <Figure label="Stations reporting" value={`0 of ${nf.format(area.stations)}`} note="0.0% of stations" />
      </section>

      <Reveal className="mt-8">
      <section className="border border-line bg-surface-2 p-5" aria-label="Register update">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Register update · IEBC, as at {registerUpdate.asAt}</p>
        {area.newEnrolments !== null ? (
          <p className="mt-2 text-base">
            <span className="tnum font-display text-2xl font-semibold">+{nf.format(area.newEnrolments)}</span>{" "}
            {area.level === "national" ? "new voters since" : "new voters enrolled in this county in the 2026 registration drive. Nationwide:"}{" "}
            {area.level === "national" ? registerUpdate.sinceDate : `${nf.format(registerUpdate.totalNewVoters)} since ${registerUpdate.sinceDate}.`}
          </p>
        ) : (
          <p className="mt-2 text-base">IEBC publishes the 2026 registration figures by county only, so none are shown for this area.</p>
        )}
        <p className="mt-2 text-sm text-muted">
          The voter and station counts above are the certified 2022 register. IEBC is still de-duplicating, verifying and auditing the new entries before it
          gazettes an updated register and allocates polling stations for 2027, so new voters are not yet included in those counts.
        </p>
      </section>
      </Reveal>

      <div className="mt-10 space-y-10">
        <Reveal>
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Results</h2>
          <div className="border border-line bg-surface p-8">
            <p className="font-display text-2xl font-medium tracking-tight">No results have been reported yet.</p>
            <p className="mt-2 max-w-xl text-muted">
              Results for the {NEXT_GENERAL_ELECTION.dateLabel} general election appear here as polling stations report and each Form 34A is verified. Only
              verified figures are ever shown, and they are unofficial: only the IEBC declares official results.
            </p>
          </div>
        </section>
        </Reveal>

        <Reveal>
          {area.level === "national" ? (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Counties</h2>
              <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
                <KenyaMap />
                <div className="max-w-md space-y-5">
                  <p className="font-display text-2xl font-medium leading-snug tracking-tight">Choose a county to see its results and how much of it has reported.</p>
                  <p className="text-muted">
                    Once polls close, each county is shaded by the share of its polling stations that have reported. Right now no county has reported, so all are the same
                    neutral shade.
                  </p>
                  <div aria-hidden="true" className="space-y-1.5">
                    <div className="h-2.5 bg-gradient-to-r from-success/15 to-success" />
                    <div className="flex justify-between text-xs text-subtle">
                      <span>None reported</span>
                      <span>All reported</span>
                    </div>
                  </div>
                  <p className="tnum text-sm text-muted">0 of {nf.format(area.counts[0]?.value ?? 47)} counties have reported.</p>
                </div>
              </div>
              <p className="mt-6 text-xs text-subtle">
                County boundaries: geoBoundaries (public domain), sourced from the RCMRD GeoPortal, matched to IEBC county codes.
              </p>
            </section>
          ) : (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Station coverage</h2>
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_13rem]">
                <CoverageWall stations={area.stations} />
                <KenyaMap compact highlight={area.code.slice(0, 3)} />
              </div>
            </section>
          )}
        </Reveal>
      </div>

      <p className="mt-16 border-t border-line pt-6 text-sm text-muted">
        {INDEPENDENCE_STATEMENT}{" "}
        <Link href="/legal/independence" className="font-medium text-ink underline underline-offset-4">
          Read the notice
        </Link>
        . Geography and registered-voter figures: {source}, as published by the Independent Electoral and Boundaries Commission.{" "}
        <Link href="/legal/data-sources" className="font-medium text-ink underline underline-offset-4">
          Data sources and methodology
        </Link>
        .
      </p>
    </>
  );
}
