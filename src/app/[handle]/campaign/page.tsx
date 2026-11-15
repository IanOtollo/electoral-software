"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button, Card, Field, Input, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { errorMessage, useMe } from "@/hooks/use-me";
import { counties, pathOf } from "@/lib/geography";

type Office = "president" | "governor" | "senator" | "woman_rep" | "mp" | "mca";
const OFFICES: { value: Office; label: string; level: "national" | "county" | "constituency" | "ward" }[] = [
  { value: "president", label: "President", level: "national" },
  { value: "governor", label: "Governor", level: "county" },
  { value: "senator", label: "Senator", level: "county" },
  { value: "woman_rep", label: "Woman Representative", level: "county" },
  { value: "mp", label: "Member of Parliament", level: "constituency" },
  { value: "mca", label: "Member of County Assembly", level: "ward" },
];

type Row = { key: string; id?: Id<"candidates">; name: string; party: string; isOurs: boolean };

type Initial = {
  office: Office | null;
  areaCode: string | null;
  party: string;
  candidates: { id: Id<"candidates">; name: string; party: string; isOurs: boolean }[];
};

export default function CampaignPage() {
  const { can } = useMe();
  const data = useQuery(api.campaign.get);
  return (
    <>
      <PageHeader
        kicker="Set up"
        title="Your campaign"
        description="Tell us which race you are in and who is on the ballot. Your agents will enter votes for exactly these candidates."
      />
      {data === undefined ? (
        <Skeleton className="h-96 max-w-3xl" />
      ) : data === null ? null : (
        <CampaignForm initial={data as Initial} canEdit={can("settings:manage")} />
      )}
    </>
  );
}

function CampaignForm({ initial, canEdit }: { initial: Initial; canEdit: boolean }) {
  const save = useMutation(api.campaign.save);
  const start = pathOf(initial.areaCode ?? undefined);
  const [office, setOffice] = useState<Office>(initial.office ?? "mp");
  const [county, setCounty] = useState(start.county);
  const [constituency, setConstituency] = useState(start.constituency);
  const [ward, setWard] = useState(start.ward);
  const [party, setParty] = useState(initial.party);
  const [rows, setRows] = useState<Row[]>(
    initial.candidates.length
      ? initial.candidates.map((c) => ({ key: c.id, id: c.id, name: c.name, party: c.party, isOurs: c.isOurs }))
      : [
          { key: "k0", name: "", party: "", isOurs: true },
          { key: "k1", name: "", party: "", isOurs: false },
        ],
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const level = OFFICES.find((o) => o.value === office)!.level;
  const cty = counties.find((c) => c.code === county);
  const con = cty?.constituencies.find((k) => k.code === constituency);
  const areaCode = level === "national" ? "" : level === "county" ? county : level === "constituency" ? constituency : ward;

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await save({
        office,
        areaCode,
        party: party.trim() || undefined,
        candidates: rows.map((r) => ({ id: r.id, name: r.name, party: r.party.trim() || undefined, isOurs: r.isOurs })),
      });
      setMsg({ ok: true, text: "Saved. You can now add your agents." });
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-10">
      {msg && (
        <div role="status" className={`border px-4 py-3 text-sm ${msg.ok ? "border-success/40 bg-success-soft text-success" : "border-danger/40 bg-danger-soft text-danger"}`}>
          {msg.text}
        </div>
      )}

      <section className="space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">The race</h2>
        <Field label="Office you are contesting" htmlFor="office">
          <Select
            id="office"
            value={office}
            disabled={!canEdit}
            onChange={(e) => {
              setOffice(e.target.value as Office);
              setConstituency("");
              setWard("");
            }}
          >
            {OFFICES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        {level === "national" ? (
          <p className="border border-line bg-surface-2 p-4 text-sm text-muted">The presidency is contested across the whole country.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="County" htmlFor="area-county">
              <Combobox
                aria-label="County"
                value={county}
                disabled={!canEdit}
                onChange={(e) => {
                  setCounty(e.target.value);
                  setConstituency("");
                  setWard("");
                }}
              >
                <option value="">Choose a county</option>
                {counties.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Combobox>
            </Field>
            {(level === "constituency" || level === "ward") && (
              <Field label="Constituency" htmlFor="area-constituency">
                <Combobox
                  aria-label="Constituency"
                  value={constituency}
                  disabled={!canEdit || !cty}
                  onChange={(e) => {
                    setConstituency(e.target.value);
                    setWard("");
                  }}
                >
                  <option value="">{cty ? "Choose a constituency" : "Choose a county first"}</option>
                  {cty?.constituencies.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.name}
                    </option>
                  ))}
                </Combobox>
              </Field>
            )}
            {level === "ward" && (
              <Field label="Ward" htmlFor="area-ward">
                <Combobox aria-label="Ward" value={ward} disabled={!canEdit || !con} onChange={(e) => setWard(e.target.value)}>
                  <option value="">{con ? "Choose a ward" : "Choose a constituency first"}</option>
                  {con?.wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </Combobox>
              </Field>
            )}
          </div>
        )}

        <Field label="Your party or ticket (optional)" htmlFor="party">
          <Input id="party" value={party} disabled={!canEdit} onChange={(e) => setParty(e.target.value)} className="max-w-sm" />
        </Field>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Candidates on the ballot</h2>
          <p className="mt-1 text-sm text-muted">List yourself and every opponent, in the order they appear on Form 34A. Mark which one is you.</p>
        </div>
        <Card className="divide-y divide-line">
          {rows.map((r, i) => (
            <div key={r.key} className="grid items-end gap-3 p-4 md:grid-cols-[1fr_12rem_auto_auto]">
              <Field label={`Candidate ${i + 1}`} htmlFor={`c-name-${r.key}`}>
                <Input id={`c-name-${r.key}`} value={r.name} disabled={!canEdit} onChange={(e) => update(r.key, { name: e.target.value })} />
              </Field>
              <Field label="Party" htmlFor={`c-party-${r.key}`}>
                <Input id={`c-party-${r.key}`} value={r.party} disabled={!canEdit} onChange={(e) => update(r.key, { party: e.target.value })} />
              </Field>
              <label className="flex h-11 items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="ours"
                  checked={r.isOurs}
                  disabled={!canEdit}
                  onChange={() => setRows((rs) => rs.map((x) => ({ ...x, isOurs: x.key === r.key })))}
                  className="size-4 accent-primary"
                />
                This is me
              </label>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove candidate ${i + 1}`}
                disabled={!canEdit || rows.length <= 2}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </Card>
        {canEdit && rows.length < 25 && (
          <Button type="button" variant="secondary" onClick={() => setRows((rs) => [...rs, { key: `k${Date.now()}`, name: "", party: "", isOurs: false }])}>
            <Plus className="size-4" /> Add candidate
          </Button>
        )}
      </section>

      {canEdit && (
        <div className="border-t border-line pt-6">
          <Button type="submit" loading={busy} className="h-12 px-8 text-base">
            Save campaign
          </Button>
        </div>
      )}
    </form>
  );
}
