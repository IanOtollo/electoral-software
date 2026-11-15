"use client";

import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

type Mode = "signup" | "signin";

const COPY: Record<Mode, { title: string; sub: string }> = {
  signup: { title: "Create your account", sub: "Free to start. It takes about a minute." },
  signin: { title: "Welcome back", sub: "Sign in to run your agents and follow your tally." },
};

/**
 * One card that is either "create account" or "sign in". Switching changes the form in
 * place (no page load): the card eases to the new height and the address is updated quietly,
 * so refreshing or sharing the link keeps you on the right side.
 */
export function AuthPanel({ initialMode, next }: { initialMode: Mode; next?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const switched = useRef(false);
  // Only steal keyboard focus after the person has actually switched, never on first page load.
  const [interacted, setInteracted] = useState(false);

  function go(m: Mode) {
    if (m === mode) return;
    setInteracted(true);
    const el = box.current;
    if (el) el.style.height = `${el.offsetHeight}px`; // pin the current height, then ease to the new one
    switched.current = true;
    setMode(m);
    const q = new URLSearchParams();
    if (m === "signin") q.set("mode", "signin");
    if (m === "signin" && next) q.set("next", next);
    window.history.replaceState(null, "", `/aspirant${q.size ? `?${q}` : ""}`);
  }

  useLayoutEffect(() => {
    const el = box.current;
    const inn = inner.current;
    if (!el || !inn || !switched.current) return;
    const target = inn.offsetHeight;
    const frame = requestAnimationFrame(() => {
      el.style.height = `${target}px`;
    });
    const release = () => {
      el.style.height = "";
    };
    el.addEventListener("transitionend", release, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("transitionend", release);
    };
  }, [mode]);

  const tab = (m: Mode, label: string, Icon: typeof UserPlus) => (
    <button
      type="button"
      role="tab"
      id={`tab-${m}`}
      aria-selected={mode === m}
      aria-controls="auth-panel"
      tabIndex={mode === m ? 0 : -1}
      onClick={() => go(m)}
      className={cn(
        "relative z-10 flex h-11 items-center justify-center gap-2 rounded-[3px] text-sm font-semibold tracking-tight transition-[color,transform] duration-200 active:scale-[0.97]",
        mode === m ? "text-primary-foreground" : "text-muted hover:text-ink",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );

  // Arrow keys move between the two sides, as people expect from a tab control.
  function onTabKeys(e: React.KeyboardEvent) {
    const next: Mode | null = e.key === "ArrowRight" || e.key === "End" ? "signin" : e.key === "ArrowLeft" || e.key === "Home" ? "signup" : null;
    if (!next) return;
    e.preventDefault();
    go(next);
    requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  }

  return (
    <div className="border border-line bg-surface p-6 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_10px_30px_-18px_rgb(0_20_60/0.35)] md:p-8">
      <div
        role="tablist"
        aria-label="Create an account or sign in"
        onKeyDown={onTabKeys}
        className="relative mb-7 grid grid-cols-2 rounded-md border border-line bg-surface-2 p-1 shadow-[inset_0_1px_3px_rgb(0_20_60/0.1)]"
      >
        {/* The thumb: glides to whichever side is active. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[3px] bg-primary shadow-[0_3px_10px_-2px_rgb(0_20_60/0.45)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            mode === "signin" && "translate-x-full",
          )}
        />
        {tab("signup", "Create account", UserPlus)}
        {tab("signin", "Sign in", LogIn)}
      </div>

      <div ref={box} className="overflow-hidden transition-[height] duration-300 ease-out">
        <div ref={inner} id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} key={mode} className="auth-swap">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{COPY[mode].title}</h2>
          <p className="mb-6 mt-1 text-sm text-muted">{COPY[mode].sub}</p>
          {mode === "signup" ? (
            <SignupForm />
          ) : (
            <Suspense>
              <LoginForm scope="campaign" home="/app" next={next} autoFocus={interacted} />
            </Suspense>
          )}
          <p className="mt-6 text-center text-sm text-muted">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button type="button" onClick={() => go(mode === "signup" ? "signin" : "signup")} className="font-semibold text-ink underline underline-offset-4">
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
