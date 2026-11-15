const MAX_CELLS = 330;
const nf = new Intl.NumberFormat("en-KE");

export type Coverage = { verified: number; pending: number; flagged: number };

/**
 * Every square is a block of polling stations, filled as they report. Colour is
 * never the only signal: the legend carries the exact counts.
 */
export function CoverageWall({ stations, coverage = { verified: 0, pending: 0, flagged: 0 } }: { stations: number; coverage?: Coverage }) {
  const unit = Math.max(1, Math.ceil(stations / MAX_CELLS));
  const cells = Math.ceil(stations / unit);
  const reporting = coverage.verified + coverage.pending + coverage.flagged;
  const seq: string[] = [];
  const push = (n: number, k: string) => {
    for (let i = 0; i < Math.round(n / unit); i++) seq.push(k);
  };
  push(coverage.verified, "bg-success");
  push(coverage.pending, "bg-warning");
  push(coverage.flagged, "bg-danger");
  while (seq.length < cells) seq.push("bg-line");

  return (
    <div>
      <div
        role="img"
        aria-label={`${nf.format(reporting)} of ${nf.format(stations)} polling stations have reported`}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${Math.min(cells, 33)}, minmax(0, 1fr))` }}
      >
        {seq.slice(0, cells).map((c, i) => (
          <i key={i} className={`wall-cell block aspect-square ${c}`} style={{ animationDelay: `${Math.min(i * 4, 1100)}ms` }} />
        ))}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <Legend swatch="bg-success" label="Verified" value={coverage.verified} />
        <Legend swatch="bg-warning" label="Awaiting verification" value={coverage.pending} />
        <Legend swatch="bg-danger" label="Flagged" value={coverage.flagged} />
        <Legend swatch="bg-line" label="Not yet reporting" value={stations - reporting} />
      </dl>
      <p className="mt-2 text-xs text-subtle">{unit === 1 ? "Each square is one polling station." : `Each square is about ${unit} polling stations.`}</p>
    </div>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <dt className={`size-2.5 ${swatch}`} aria-hidden="true" />
      <dd className="tnum">
        {label} <span className="font-semibold text-ink">{nf.format(value)}</span>
      </dd>
    </div>
  );
}
