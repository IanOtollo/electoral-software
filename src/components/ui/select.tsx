"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeScroll } from "./fade-scroll";

type Option = { value: string; label: string; disabled: boolean };

/** Drop-in for a native <select>: pass <option> children and read e.target.value. */
export function Select({
  value,
  onChange,
  children,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [flip, setFlip] = useState(false);
  const typed = useRef({ text: "", at: 0 });

  const options = useMemo<Option[]>(
    () =>
      Children.toArray(children).flatMap((c) => {
        if (!isValidElement(c)) return [];
        const p = c.props as { value?: string; children?: ReactNode; disabled?: boolean };
        return [{ value: String(p.value ?? ""), label: Children.toArray(p.children).join(""), disabled: !!p.disabled }];
      }),
    [children],
  );
  const selected = options.findIndex((o) => o.value === value);
  const current = options[selected] ?? options[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, uid]);

  function show() {
    const r = trigger.current?.getBoundingClientRect();
    setFlip(!!r && window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom);
    setActive(Math.max(0, selected));
    setOpen(true);
  }
  function pick(i: number) {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange({ target: { value: o.value } });
    setOpen(false);
    trigger.current?.focus();
  }
  function move(from: number, dir: 1 | -1) {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return i;
    return from;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    const k = e.key;
    if (k === "Tab") return setOpen(false);
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(k)) {
        e.preventDefault();
        show();
      }
      return;
    }
    if (k === "ArrowDown") setActive((a) => move(a, 1));
    else if (k === "ArrowUp") setActive((a) => move(a, -1));
    else if (k === "Home") setActive(move(-1, 1));
    else if (k === "End") setActive(move(options.length, -1));
    else if (k === "Enter" || k === " ") pick(active);
    else if (k === "Escape") setOpen(false);
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey) {
      const t = typed.current;
      t.text = e.timeStamp - t.at > 600 ? k.toLowerCase() : t.text + k.toLowerCase();
      t.at = e.timeStamp;
      const hit = options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(t.text));
      if (hit >= 0) setActive(hit);
      return;
    } else return;
    e.preventDefault();
  }

  return (
    <div ref={root} className={cn("relative h-11 w-full", className)} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${uid}-opt-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        className={cn(
          "flex h-full w-full items-center justify-between gap-2 border bg-surface px-3 text-left text-base text-ink transition-colors",
          open ? "border-ink" : "border-line-strong hover:border-subtle",
          "focus-visible:border-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-subtle",
        )}
      >
        <span className={cn("truncate", !current?.value && "text-muted")}>{current?.label}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <FadeScroll
          className={cn(
            "absolute left-0 z-50 max-h-72 min-w-full border border-ink bg-surface shadow-pop",
            flip ? "bottom-full mb-1" : "top-full mt-1",
          )}
          innerClassName="max-h-72 py-1"
        >
          <ul id={listId} role="listbox" aria-label={ariaLabel} tabIndex={-1}>
            {options.map((o, i) => (
              <li
                key={o.value + i}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={i === selected}
                aria-disabled={o.disabled || undefined}
                onPointerEnter={() => !o.disabled && setActive(i)}
                onClick={() => pick(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-base",
                  i === active && "bg-surface-2",
                  i === selected && "font-semibold",
                  o.disabled && "cursor-not-allowed text-subtle",
                  !o.value && "text-muted",
                )}
              >
                <span className="truncate">{o.label}</span>
                {i === selected && <Check className="size-4 shrink-0" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </FadeScroll>
      )}
    </div>
  );
}
