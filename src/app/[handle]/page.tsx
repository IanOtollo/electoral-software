"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { PageHeader, Skeleton } from "@/components/ui/primitives";
import { useBase, useMe } from "@/hooks/use-me";
import { Stagger, StaggerItem } from "@/components/motion/motion";

const nf = new Intl.NumberFormat("en-KE");

export default function OverviewPage() {
  const { me } = useMe();
  const base = useBase();
  const campaign = useQuery(api.campaign.get);
  const overview = useQuery(api.tally.overview);
  if (!me) return null;

  const ready = !!campaign?.office;
  const hasAgents = (overview?.agents.total ?? 0) > 0;
  const reporting = (overview?.stationsReported ?? 0) > 0;
  const steps = [
    { done: ready, title: "Set up your race", body: "Choose your office, the area you contest and the candidates on the ballot.", href: `${base}/campaign`, cta: "Set up campaign" },
    { done: hasAgents, title: "Add your agents", body: "Assign each agent their polling stations and send them a private link and PIN.", href: `${base}/agents`, cta: "Add agents" },
    { done: reporting, title: "Watch results come in", body: "Agents submit the signed Form 34A. Each station appears on your tally with the photo beside the figures.", href: `${base}/tally`, cta: "Open live tally" },
  ];
  const next = steps.find((s) => !s.done);

  return (
    <>
      <PageHeader kicker={me.tenant?.name} title={`Welcome, ${me.name.split(" ")[0]}`} description="Run your agents and follow your own tally from one place." />

      {overview === undefined || campaign === undefined ? (
        <Skeleton className="h-64 max-w-3xl" />
      ) : (
        <Stagger as="ol" className="max-w-3xl border-t border-line">
          {steps.map((s, i) => (
            <StaggerItem as="li" key={s.title} className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-4 border-b border-line py-6">
              <span
                className={`flex size-8 items-center justify-center rounded-full border text-sm font-semibold ${s.done ? "border-success bg-success text-primary-foreground" : "border-line-strong text-muted"}`}
                aria-label={s.done ? "Done" : `Step ${i + 1}`}
              >
                {s.done ? <Check className="size-4" /> : i + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-1 text-muted">{s.body}</p>
              </div>
              <Link
                href={s.href}
                className={`inline-flex h-10 items-center px-4 text-sm font-medium ${s === next ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border border-line-strong hover:bg-surface-2"}`}
              >
                {s.done ? "Open" : s.cta}
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {overview && overview.stationsAssigned > 0 && (
        <section className="mt-10 grid max-w-3xl gap-px border border-line bg-line sm:grid-cols-3">
          {[
            { l: "Stations reporting", v: `${nf.format(overview.stationsReported)} of ${nf.format(overview.stationsAssigned)}` },
            { l: "Valid votes", v: nf.format(overview.validVotes) },
            { l: "Needs checking", v: nf.format(overview.flagged) },
          ].map((f) => (
            <div key={f.l} className="bg-background p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{f.l}</p>
              <p className="tnum mt-2 font-display text-3xl font-medium">{f.v}</p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
