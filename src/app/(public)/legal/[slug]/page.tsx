import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CHANGELOG, DOCS, fill, getDoc, type Block } from "@/content/legal";
import { PublicChrome } from "@/components/public/public-chrome";
import { INDEPENDENCE_STATEMENT, LEGAL } from "@/lib/legal-config";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => DOCS.map((d) => ({ slug: d.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = getDoc((await params).slug);
  return { title: doc?.title ?? "Legal", description: doc ? fill(doc.summary) : undefined };
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string") return <p>{fill(block)}</p>;
  if ("list" in block) {
    return (
      <ul className="list-disc space-y-2 pl-6 marker:text-subtle">
        {block.list.map((item, i) => (
          <li key={i}>{fill(item)}</li>
        ))}
      </ul>
    );
  }
  if ("note" in block) {
    return <div className="border-l-4 border-desk bg-surface-2 px-4 py-3 text-[0.95rem] text-ink">{fill(block.note)}</div>;
  }
  const { head, rows } = block.table;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[32rem] text-left text-[0.95rem]">
        <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold">
                {fill(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 ${j === 0 ? "font-medium text-ink" : "text-ink/85"}`}>
                  {fill(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function LegalPage({ params }: Props) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();

  return (
    <PublicChrome>
    <article className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
      {/* Phones and tablets: the button rides along under the countdown bar, so it is always within reach. */}
      <div className="sticky top-[var(--banner-h)] z-30 -mx-4 -mt-10 border-b border-line bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <Link href="/" className="inline-flex h-10 items-center gap-2 border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back home
        </Link>
      </div>

      {/* Desktop: the button sits just above "Legal" and the whole column stays pinned below the countdown bar. */}
      <aside className="z-20 lg:sticky lg:top-[calc(var(--banner-h)+1.5rem)] lg:self-start">
        <Link
          href="/"
          className="mb-6 hidden h-10 items-center gap-2 border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-2 lg:inline-flex"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back home
        </Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Legal</p>
        <ul className="mt-3 space-y-1 border-l border-line">
          {DOCS.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/legal/${d.slug}`}
                aria-current={d.slug === doc.slug ? "page" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm ${d.slug === doc.slug ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                {d.short}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <div className="max-w-3xl">
        <header className="border-b-2 border-desk pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Version {LEGAL.version} · Effective {LEGAL.effective}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-lg text-muted">{fill(doc.summary)}</p>
        </header>

        <section aria-label="In short" className="mt-8 border border-line bg-surface p-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">In short</h2>
          <ul className="mt-3 space-y-2 text-[0.95rem]">
            {doc.inShort.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-desk" />
                <span>{fill(t)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="my-6 border border-line bg-surface-2 p-4 text-sm">
          <span className="font-semibold">Independent software. </span>
          {INDEPENDENCE_STATEMENT.replace("Independent software. ", "")}
        </div>

        <nav aria-label="On this page" className="mb-10">
          <ol className="columns-1 gap-8 text-sm sm:columns-2">
            {doc.sections.map((s) => (
              <li key={s.id} className="py-0.5">
                <a href={`#${s.id}`} className="text-muted underline-offset-4 hover:text-ink hover:underline">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-[calc(var(--banner-h)+1.5rem)]">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{s.heading}</h2>
              <div className="mt-3 space-y-4 text-base leading-relaxed text-ink/90">
                {s.body.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-line pt-6 text-sm text-muted">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em]">Version history</h2>
          <ul className="mt-2 space-y-1">
            {CHANGELOG.map((c) => (
              <li key={c.version}>
                <span className="font-medium text-ink">
                  v{c.version}, {c.date}.
                </span>{" "}
                {c.change}
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Checked against the Data Protection Act, 2019, the Data Protection (General) Regulations, 2021 and the Communications Authority of Kenya&apos;s July 2017
            political messaging guidelines. These documents describe how the service works and what is expected of its users; they are not a substitute for legal advice.
          </p>
        </footer>
      </div>
    </article>
    </PublicChrome>
  );
}
