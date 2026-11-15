"use client";

import { Component, use, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Camera, CheckCircle2, ChevronLeft } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { errorMessage } from "@/hooks/use-me";
import { TallyMark } from "@/components/public/site-header";

const nf = new Intl.NumberFormat("en-KE");
const sessionKey = (t: string) => `agent-session:${t}`;

/** Each phone gets a random id the first time; the server locks the link to the first phone that unlocks it. */
function deviceId() {
  try {
    let id = localStorage.getItem("agent-device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("agent-device", id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

/** Shrink a phone photo to something that uploads reliably on weak mobile data. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/jpeg", 0.82));
}

export default function AgentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [session, setSession] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Read once on the client; a lazy initialiser would not match the server render.
    queueMicrotask(() => {
      try {
        setSession(sessionStorage.getItem(sessionKey(token)));
      } catch {
        setSession(null);
      }
      setReady(true);
    });
  }, [token]);

  if (!ready) return <Shell>{null}</Shell>;
  return (
    <Shell>
      {session ? (
        <SessionBoundary
          key={session}
          onFail={() => {
            try {
              sessionStorage.removeItem(sessionKey(token));
            } catch {
              /* ignore */
            }
            setSession(null);
          }}
        >
          <Console
            session={session}
            onEnd={() => {
              try {
                sessionStorage.removeItem(sessionKey(token));
              } catch {
                /* ignore */
              }
              setSession(null);
            }}
          />
        </SessionBoundary>
      ) : (
        <PinGate
          token={token}
          onUnlocked={(s) => {
            try {
              sessionStorage.setItem(sessionKey(token), s);
            } catch {
              /* ignore */
            }
            setSession(s);
          }}
        />
      )}
    </Shell>
  );
}

/** If the session is rejected (expired, access switched off) the query throws; send the agent back to the PIN screen. */
class SessionBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-var(--banner-h))] w-full max-w-md flex-col px-5 pb-10 pt-6">
      <div className="mb-8 flex items-center gap-3">
        <TallyMark className="size-8 shrink-0" />
        <span className="font-display text-base font-semibold leading-tight">
          Campaign Management System
          <small className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Polling agent</small>
        </span>
      </div>
      {children}
    </div>
  );
}

function PinGate({ token, onUnlocked }: { token: string; onUnlocked: (session: string) => void }) {
  const unlock = useMutation(api.agentPortal.unlock);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await unlock({ token, pin, deviceId: deviceId() });
      if (r.ok) return onUnlocked(r.session);
      setError(
        r.reason === "locked"
          ? `Too many wrong PINs. Try again in ${Math.ceil(r.retryAfterMs / 60000)} minutes, or ask your campaign for a new PIN.`
          : r.reason === "other_device"
            ? "This link is already locked to another phone. Ask your campaign for a new link and PIN."
            : r.reason === "disabled"
              ? "Your access has been switched off. Contact your campaign."
              : "That link or PIN is not right.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold leading-tight">Enter your PIN</h1>
        <p className="mt-2 text-muted">Your campaign sent you a 6-digit PIN. Use the same phone each time.</p>
      </div>
      {error && (
        <div role="alert" className="border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit PIN"
        autoFocus
        placeholder="••••••"
        className="tnum h-16 w-full border border-line-strong bg-surface text-center font-display text-4xl tracking-[0.4em] focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        disabled={pin.length !== 6 || busy}
        className="h-14 w-full bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-40"
      >
        {busy ? "Checking…" : "Open"}
      </button>
    </form>
  );
}

function Console({ session, onEnd }: { session: string; onEnd: () => void }) {
  const data = useQuery(api.agentPortal.me, { session });
  const [station, setStation] = useState<string | null>(null);

  if (data === undefined) return <p className="text-muted">Loading…</p>;
  const chosen = data.stations.find((s) => s.code === station);

  if (chosen) {
    return (
      <EntryForm
        key={chosen.code}
        session={session}
        station={chosen}
        candidates={data.candidates}
        onBack={() => setStation(null)}
        onSessionError={onEnd}
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold leading-tight">Hello, {data.agentName.split(" ")[0]}</h1>
      <p className="mt-1 text-muted">{data.campaign}</p>
      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your polling stations</h2>
      <ul className="space-y-3">
        {data.stations.map((s) => (
          <li key={s.code}>
            <button type="button" onClick={() => setStation(s.code)} className="w-full border border-line-strong bg-surface p-4 text-left active:bg-surface-2">
              <p className="text-lg font-semibold">{s.name}</p>
              <p className="tnum mt-0.5 text-sm text-muted">{nf.format(s.voters)} registered voters</p>
              <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-medium ${s.submitted ? "text-success" : "text-muted"}`}>
                {s.submitted ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
                {s.submitted ? "Sent. Tap to correct it" : "Tap to send results"}
              </p>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onEnd} className="mt-8 text-sm text-muted underline underline-offset-4">
        Lock this screen
      </button>
    </div>
  );
}

function EntryForm({
  session,
  station,
  candidates,
  onBack,
  onSessionError,
}: {
  session: string;
  station: { code: string; name: string; voters: number; submitted: { votes: { candidateId: string; votes: number }[]; rejected: number } | null };
  candidates: { id: string; name: string; party: string }[];
  onBack: () => void;
  onSessionError: () => void;
}) {
  const getUrl = useMutation(api.agentPortal.generateUploadUrl);
  const submit = useMutation(api.agentPortal.submit);
  const prev = station.submitted;
  const [votes, setVotes] = useState<Record<string, string>>(() => Object.fromEntries(candidates.map((c) => [c.id, prev ? String(prev.votes.find((v) => v.candidateId === c.id)?.votes ?? "") : ""])));
  const [rejected, setRejected] = useState(prev ? String(prev.rejected) : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ flags: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const num = (s: string) => (s === "" ? NaN : Number(s));
  const allFilled = candidates.every((c) => Number.isInteger(num(votes[c.id]))) && Number.isInteger(num(rejected));
  const valid = candidates.reduce((n, c) => n + (num(votes[c.id]) || 0), 0);
  const cast = valid + (num(rejected) || 0);
  const over = cast > station.voters;

  async function send() {
    setError("");
    setBusy(true);
    try {
      const blob = await compress(photo!);
      const url = await getUrl({ session });
      const up = await fetch(url, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      if (!up.ok) throw new Error("upload");
      const { storageId } = (await up.json()) as { storageId: Id<"_storage"> };
      const r = await submit({
        session,
        stationCode: station.code,
        votes: candidates.map((c) => ({ candidateId: c.id as Id<"candidates">, votes: Number(votes[c.id]) })),
        rejected: Number(rejected),
        storageId,
      });
      setDone({ flags: r.flags });
    } catch (e) {
      const msg = errorMessage(e);
      if (/session|PIN|switched off/i.test(msg)) return onSessionError();
      setError(msg === "Something went wrong. Please try again." ? "Could not send. Check your signal and try again. Your figures are still here." : msg);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
        <h1 className="font-display text-3xl font-semibold leading-tight">Results sent</h1>
        <p className="text-muted">{station.name} has been recorded with your photo of Form 34A.</p>
        {done.flags.length > 0 && (
          <div role="alert" className="flex gap-2 border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Your campaign has been alerted to check this station, because the totals look unusual. If you made a mistake, go back and send it again.
          </div>
        )}
        <button type="button" onClick={onBack} className="h-14 w-full bg-primary text-lg font-semibold text-primary-foreground">
          Back to my stations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <button type="button" onClick={onBack} className="-ml-1 inline-flex items-center gap-1 text-sm text-muted">
        <ChevronLeft className="size-4" aria-hidden="true" /> My stations
      </button>
      <div>
        <h1 className="font-display text-3xl font-semibold leading-tight">{station.name}</h1>
        <p className="tnum text-muted">{nf.format(station.voters)} registered voters</p>
        {prev && <p className="mt-2 border border-warning/40 bg-warning-soft p-3 text-sm text-warning">You already sent this station. Sending again replaces it.</p>}
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">1. Photograph Form 34A</h2>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} aria-label="Photo of Form 34A" />
        {preview ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your photo of Form 34A" className="max-h-72 w-full border border-line object-contain" />
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-sm underline underline-offset-4">
              Retake photo
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex h-28 w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-line-strong text-muted active:bg-surface-2">
            <Camera className="size-7" aria-hidden="true" />
            <span className="font-medium">Take a clear photo of the signed form</span>
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">2. Enter the figures exactly as written</h2>
        <div className="space-y-3">
          {candidates.map((c) => (
            <label key={c.id} className="block">
              <span className="mb-1 block font-medium">
                {c.name} {c.party && <span className="font-normal text-muted">({c.party})</span>}
              </span>
              <input
                value={votes[c.id]}
                onChange={(e) => setVotes((v) => ({ ...v, [c.id]: e.target.value.replace(/\D/g, "").slice(0, 7) }))}
                inputMode="numeric"
                placeholder="0"
                className="tnum h-14 w-full border border-line-strong bg-surface px-4 text-2xl focus:border-ink focus:outline-none"
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block font-medium">Rejected ballots</span>
            <input
              value={rejected}
              onChange={(e) => setRejected(e.target.value.replace(/\D/g, "").slice(0, 7))}
              inputMode="numeric"
              placeholder="0"
              className="tnum h-14 w-full border border-line-strong bg-surface px-4 text-2xl focus:border-ink focus:outline-none"
            />
          </label>
        </div>
        <p className={`tnum mt-4 text-sm ${over ? "font-semibold text-danger" : "text-muted"}`}>
          Total ballots: {nf.format(cast)} of {nf.format(station.voters)} registered
          {over && " (more than the register: check your figures)"}
        </p>
      </section>

      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1 size-5 shrink-0 accent-primary" />
        <span>I confirm these figures match the signed Form 34A for this station.</span>
      </label>

      {error && (
        <div role="alert" className="border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <button type="button" disabled={!photo || !allFilled || !confirm || busy} onClick={send} className="h-14 w-full bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-40">
        {busy ? "Sending…" : prev ? "Send corrected results" : "Send results"}
      </button>
      {!photo && <p className="-mt-3 text-sm text-muted">A photo of the form is required.</p>}
    </div>
  );
}
