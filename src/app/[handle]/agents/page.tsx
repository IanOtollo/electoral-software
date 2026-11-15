"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Skeleton } from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/combobox";
import { Modal } from "@/components/ui/modal";
import { errorMessage, useBase, useMe } from "@/hooks/use-me";
import { counties } from "@/lib/geography";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

export default function AgentsPage() {
  const { can } = useMe();
  const base = useBase();
  const campaign = useQuery(api.campaign.get);
  const agents = useQuery(api.agents.list);
  const update = useMutation(api.agents.update);
  const reset = useMutation(api.agents.resetAccess);
  const [adding, setAdding] = useState(false);
  const [creds, setCreds] = useState<{ name: string; token: string; pin: string } | null>(null);
  const [error, setError] = useState("");
  const manage = can("tally:manage");
  const ready = !!campaign?.office;

  async function run(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        kicker="Field operations"
        title="Agents"
        description="Your people at the polling stations. Each gets a private link and PIN for their phone. No app to install."
        actions={
          manage && (
            <Button onClick={() => setAdding(true)} disabled={!ready}>
              <Plus className="size-4" /> Add agent
            </Button>
          )
        }
      />

      {campaign && !ready && (
        <div className="mb-6 border border-warning/40 bg-warning-soft p-4 text-sm text-warning">
          Set up your race first so we know which stations are yours.{" "}
          <Link href={`${base}/campaign`} className="font-semibold underline underline-offset-4">
            Go to Campaign
          </Link>
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {agents === undefined ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : agents.length === 0 ? (
          <EmptyState title="No agents yet" description="Add an agent and assign them the polling stations they will cover." />
        ) : (
          <ul className="divide-y divide-line">
            {agents.map((a) => (
              <li key={a.id} className={`grid gap-4 p-5 md:grid-cols-[1fr_auto] ${a.status === "disabled" ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-lg font-semibold">{a.name}</p>
                    <Badge tone={a.status === "active" ? "success" : "neutral"}>{a.status === "active" ? "Active" : "Switched off"}</Badge>
                    {a.bound && <Badge>Phone locked</Badge>}
                  </div>
                  <p className="tnum text-sm text-muted">
                    {a.phone} · {a.lastSeenAt ? `last opened ${dateFmt.format(a.lastSeenAt)}` : "has not opened the link yet"}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {a.stations.map((s) => (
                      <li key={s.code} className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1 text-sm">
                        {s.reported && <Check className="size-3.5 text-success" aria-label="Reported" />}
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
                {manage && (
                  <div className="flex flex-wrap items-start gap-2 md:justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        run(async () => {
                          const r = await reset({ agentId: a.id as Id<"agents"> });
                          setCreds({ name: a.name, ...r });
                        })
                      }
                    >
                      New link and PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => run(() => update({ agentId: a.id as Id<"agents">, status: a.status === "active" ? "disabled" : "active" }))}
                    >
                      {a.status === "active" ? "Switch off" : "Switch on"}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {campaign?.areaCode !== undefined && (
        <AddAgentModal
          open={adding}
          onClose={() => setAdding(false)}
          areaCode={campaign?.areaCode ?? ""}
          onCreated={(c) => {
            setAdding(false);
            setCreds(c);
          }}
        />
      )}
      <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
    </>
  );
}

type Picked = Map<string, { name: string; stream: string; voters: number }>;

function AddAgentModal({
  open,
  onClose,
  areaCode,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  areaCode: string;
  onCreated: (c: { name: string; token: string; pin: string }) => void;
}) {
  const create = useMutation(api.agents.create);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // Pre-fill whatever part of the geography the campaign already fixes.
  const [county, setCounty] = useState(areaCode.slice(0, 3));
  const [constituency, setConstituency] = useState(areaCode.length >= 6 ? areaCode.slice(0, 6) : "");
  const [ward, setWard] = useState(areaCode.length === 10 ? areaCode : "");
  const [picked, setPicked] = useState<Picked>(new Map());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cty = counties.find((c) => c.code === county);
  const con = cty?.constituencies.find((k) => k.code === constituency);
  const stations = useQuery(api.agents.stationsInWard, ward ? { wardCode: ward } : "skip");

  function close() {
    setName("");
    setPhone("");
    setPicked(new Map());
    setError("");
    onClose();
  }

  const toggle = (s: { code: string; name: string; stream: string; voters: number }) =>
    setPicked((m) => {
      const n = new Map(m);
      if (n.has(s.code)) n.delete(s.code);
      else n.set(s.code, { name: s.name, stream: s.stream, voters: s.voters });
      return n;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await create({ name, phone, stationCodes: [...picked.keys()] });
      onCreated({ name, token: r.token, pin: r.pin });
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Add an agent" description="Choose the polling stations this person will cover.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}
        <Field label="Agent's full name" htmlFor="ag-name">
          <Input id="ag-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Mobile number" htmlFor="ag-phone" hint="For example 0712 345 678">
          <Input id="ag-phone" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <fieldset className="space-y-3 border-t border-line pt-4">
          <legend className="text-sm font-medium">Polling stations</legend>
          <Combobox
            aria-label="County"
            value={county}
            disabled={areaCode.length >= 3}
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
          <Combobox
            aria-label="Constituency"
            value={constituency}
            disabled={!cty || areaCode.length >= 6}
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
          <Combobox aria-label="Ward" value={ward} disabled={!con || areaCode.length === 10} onChange={(e) => setWard(e.target.value)}>
            <option value="">{con ? "Choose a ward" : "Choose a constituency first"}</option>
            {con?.wards.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </Combobox>

          {ward && (
            <div className="max-h-56 overflow-y-auto border border-line">
              {stations === undefined ? (
                <Skeleton className="m-3 h-8" />
              ) : stations.length === 0 ? (
                <p className="p-3 text-sm text-muted">No stations in this ward are inside your race.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {stations.map((s) => (
                    <li key={s.code}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-2">
                        <input type="checkbox" checked={picked.has(s.code)} onChange={() => toggle(s)} className="size-4 accent-primary" />
                        <span className="flex-1">
                          {s.name} <span className="text-muted">· stream {s.stream}</span>
                        </span>
                        <span className="tnum text-muted">{s.voters} voters</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {picked.size > 0 && (
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">{picked.size}</span> station{picked.size === 1 ? "" : "s"} selected (up to 10 per agent)
            </p>
          )}
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={picked.size === 0}>
            Create agent
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CredentialsModal({ creds, onClose }: { creds: { name: string; token: string; pin: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState<"link" | "pin" | null>(null);
  const link = creds && typeof window !== "undefined" ? `${window.location.origin}/agent/${creds.token}` : "";
  async function copy(what: "link" | "pin", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable: the values are selectable */
    }
  }
  return (
    <Modal open={!!creds} onClose={onClose} title={creds ? `Access for ${creds.name}` : ""} description="Shown once. Send the link and the PIN in two separate messages.">
      {creds && (
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Private link</p>
            <code className="block break-all border border-line-strong bg-surface-2 p-3 font-mono text-xs select-all">{link}</code>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => copy("link", link)}>
              {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />} {copied === "link" ? "Copied" : "Copy link"}
            </Button>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">PIN</p>
            <p className="tnum font-display text-4xl font-semibold tracking-[0.3em] select-all">{creds.pin}</p>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => copy("pin", creds.pin)}>
              {copied === "pin" ? <Check className="size-4" /> : <Copy className="size-4" />} {copied === "pin" ? "Copied" : "Copy PIN"}
            </Button>
          </div>
          <p className="text-sm text-muted">
            The link works on one phone: the first phone that opens it is locked in. If the agent changes phones, use &quot;New link and PIN&quot; to start again.
          </p>
          <Button type="button" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
