"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const IDLE_MS = 900;
const MIN_THUMB = 28;

/**
 * Overlay scrollbar that appears while you scroll or hover and then fades away
 * gradually. The native bar is hidden; the thumb is draggable, and the content
 * keeps native keyboard and touch scrolling.
 */
export function FadeScroll({ children, className, innerClassName }: { children: ReactNode; className?: string; innerClassName?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ startY: number; startScroll: number } | null>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0 });
  const [awake, setAwake] = useState(false);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) return setThumb((t) => (t.height === 0 ? t : { top: 0, height: 0 }));
    const height = Math.max(MIN_THUMB, (clientHeight * clientHeight) / scrollHeight);
    const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height);
    setThumb({ top, height });
  }, []);

  const wake = useCallback(() => {
    setAwake(true);
    clearTimeout(timer.current);
    if (!drag.current) timer.current = setTimeout(() => setAwake(false), IDLE_MS);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      ro.disconnect();
      clearTimeout(timer.current);
    };
  }, [measure]);

  function onThumbDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = box.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startScroll: el.scrollTop };
    wake();
  }
  function onThumbMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = box.current;
    if (!el || !drag.current) return;
    const track = el.clientHeight - thumb.height;
    const ratio = (el.scrollHeight - el.clientHeight) / track;
    el.scrollTop = drag.current.startScroll + (e.clientY - drag.current.startY) * ratio;
  }
  function onThumbUp() {
    drag.current = null;
    wake();
  }

  return (
    <div className={cn("relative min-h-0", className)} onPointerMove={wake} onPointerEnter={wake}>
      <div
        ref={box}
        onScroll={() => {
          measure();
          wake();
        }}
        className={cn("h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", innerClassName)}
      >
        {children}
      </div>
      {thumb.height > 0 && (
        <div
          aria-hidden="true"
          onPointerDown={onThumbDown}
          onPointerMove={onThumbMove}
          onPointerUp={onThumbUp}
          onPointerCancel={onThumbUp}
          className={cn(
            "absolute right-0.5 top-0 w-1.5 touch-none rounded-full bg-ink/40 transition-opacity duration-1000 ease-out hover:bg-ink/60",
            awake ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
        />
      )}
    </div>
  );
}
