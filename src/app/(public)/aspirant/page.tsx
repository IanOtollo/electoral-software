import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PublicChrome } from "@/components/public/public-chrome";

export const metadata: Metadata = {
  title: "Are you an aspirant?",
  description: "Create your campaign account to manage polling agents, follow your own tally and message voters.",
};

const STEPS = [
  { n: "1", title: "Set up your race", body: "Choose your office and the area you are contesting, and list the candidates on the ballot." },
  { n: "2", title: "Add your agents", body: "Assign each agent to their polling stations. They get a private link and PIN for their phone, with no app to install." },
  { n: "3", title: "Watch your tally build", body: "Agents photograph the signed Form 34A and enter the figures. You see every station as it reports, with the photo beside the numbers." },
  { n: "4", title: "Message your voters", body: "Upload your contact lists and send SMS to all of them or to groups. Messaging runs on message credit that we add to your account." },
];

export default async function AspirantPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const sp = await searchParams;
  const mode = sp.mode === "signin" ? "signin" : "signup";
  // Only a same-site path may be carried through sign-in.
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  return (
    <PublicChrome>
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">For aspirants and campaign teams</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">Are you an aspirant?</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Create your account to run your polling agents, follow your own results as they come in, and reach voters by SMS, all from one place.
        </p>

        <ol className="mt-10 space-y-6 border-t-2 border-desk pt-8">
          {STEPS.map((s) => (
            <li key={s.n} className="grid grid-cols-[2.5rem_1fr] gap-4">
              <span className="font-display text-3xl font-semibold leading-none text-subtle">{s.n}</span>
              <div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="mt-1 text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 border border-line bg-surface-2 p-5 text-sm leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-ink">Your tally is private to your campaign.</span> Figures your agents submit are visible only to you and are not
            published on the public results pages. They are unofficial: only the IEBC declares official results.
          </p>
        </div>
      </div>

      <div className="lg:pt-2">
        <AuthPanel initialMode={mode} next={next} />
      </div>
    </div>
    </PublicChrome>
  );
}
