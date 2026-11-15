import Link from "next/link";
import { DOCS } from "@/content/legal";
import { INDEPENDENCE_STATEMENT, LEGAL } from "@/lib/legal-config";
import { TallyMark } from "./site-header";

const col = "text-xs font-semibold uppercase tracking-[0.14em] text-desk-muted";
const link = "text-sm text-desk-foreground/90 underline-offset-4 hover:text-desk-foreground hover:underline";

/** Official footer: independence statement first, then legal, data and operator details. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const owner = LEGAL.operatorName ?? LEGAL.service;
  return (
    <footer className="mt-24 bg-desk text-desk-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="border-b border-desk-2 py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-desk-muted">Independent software</p>
          <p className="mt-2 max-w-4xl font-display text-xl font-medium leading-snug md:text-2xl">{INDEPENDENCE_STATEMENT}</p>
          <Link href="/legal/independence" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
            Read the independence and official results notice
          </Link>
        </div>

        <div className="grid gap-10 py-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-3">
              <TallyMark className="size-8 shrink-0" />
              <span className="font-display text-base font-semibold leading-tight">{LEGAL.service}</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-desk-muted">
              Public election results by area, built from IEBC-published geography and agent-submitted, verified Form 34A figures.
            </p>
          </div>

          <nav aria-label="Legal">
            <h2 className={col}>Legal</h2>
            <ul className="mt-4 space-y-2.5">
              {DOCS.filter((d) => d.slug !== "data-sources").map((d) => (
                <li key={d.slug}>
                  <Link href={`/legal/${d.slug}`} className={link}>
                    {d.short}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Data">
            <h2 className={col}>Results and data</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/" className={link}>
                  Find your area
                </Link>
              </li>
              <li>
                <Link href="/legal/data-sources" className={link}>
                  Data sources and methodology
                </Link>
              </li>
              <li>
                <Link href="/aspirant" className={link}>
                  Are you an aspirant?
                </Link>
              </li>
              <li>
                <Link href="/aspirant?mode=signin" className={link}>
                  Aspirant sign in
                </Link>
              </li>
              <li>
                <a href="https://www.iebc.or.ke" target="_blank" rel="noopener noreferrer" className={link}>
                  Official results: iebc.or.ke
                </a>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className={col}>Operator</h2>
            <address className="mt-4 space-y-1.5 text-sm not-italic text-desk-foreground/90">
              <p className="font-medium text-desk-foreground">{owner}</p>
              {LEGAL.operatorAddress && <p>{LEGAL.operatorAddress}</p>}
              {LEGAL.contactEmail && (
                <p>
                  <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-4 hover:text-desk-foreground">
                    {LEGAL.contactEmail}
                  </a>
                </p>
              )}
              {LEGAL.odpcRegistration && <p className="text-desk-muted">Data Protection Commissioner registration: {LEGAL.odpcRegistration}</p>}
            </address>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-desk-2 py-6 text-xs text-desk-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {owner}. All rights reserved. Governed by the laws of Kenya.
          </p>
          <p>
            Terms and policies version {LEGAL.version}, effective {LEGAL.effective}.
          </p>
        </div>
      </div>
    </footer>
  );
}
