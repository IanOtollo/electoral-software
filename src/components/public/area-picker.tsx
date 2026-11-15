"use client";

import { useRouter } from "next/navigation";
import { counties, pathOf } from "@/lib/geography";
import { Combobox } from "@/components/ui/combobox";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Choosing at any level navigates straight to that area, so every view has a shareable URL. */
export function AreaPicker({ current }: { current?: string }) {
  const router = useRouter();
  const sel = pathOf(current);
  const county = counties.find((c) => c.code === sel.county);
  const constituency = county?.constituencies.find((k) => k.code === sel.constituency);
  const go = (code: string, fallback: string) => router.push(code ? `/area/${code}` : fallback);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Labelled label="County">
        <Combobox aria-label="County" className="h-12" value={sel.county} onChange={(e) => go(e.target.value, "/")}>
          <option value="">All counties</option>
          {counties.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Combobox>
      </Labelled>
      <Labelled label="Constituency">
        <Combobox aria-label="Constituency" className="h-12" disabled={!county} value={sel.constituency} onChange={(e) => go(e.target.value, `/area/${sel.county}`)}>
          <option value="">{county ? `All of ${county.name}` : "Choose a county first"}</option>
          {county?.constituencies.map((k) => (
            <option key={k.code} value={k.code}>
              {k.name}
            </option>
          ))}
        </Combobox>
      </Labelled>
      <Labelled label="Ward">
        <Combobox aria-label="Ward" className="h-12" disabled={!constituency} value={sel.ward} onChange={(e) => go(e.target.value, `/area/${sel.constituency}`)}>
          <option value="">{constituency ? `All of ${constituency.name}` : "Choose a constituency first"}</option>
          {constituency?.wards.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </Combobox>
      </Labelled>
    </div>
  );
}
