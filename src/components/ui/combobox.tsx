"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeScroll } from "./fade-scroll";

type Option = { value: string; label: string };

/** Lower-case and strip punctuation/spaces so "tharaka nithi" finds "Tharaka - Nithi" and "murang a" finds "Murang'a". */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/**
 * Type-to-search dropdown. Click the field and start typing; the list narrows as
 * you type. Pass <option> children like a native select and read e.target.value.
 */
export function Combobox({
  value,
  onChange,
  children,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [flip, setFlip] = useState(false);

  const options = useMemo<Option[]>(
    () =>
      Children.toArray(children).flatMap((c) => {
        if (!isValidElement(c)) return [];
        const p = c.props as { value?: string; children?: ReactNode };
        return [{ value: String(p.value ?? ""), label: Children.toArray(p.children).join("") }];
      }),
    [children],
  );

  const selected = options.find((o) => o.value === value) ?? options[0];
  const q = norm(query);
  const shown = useMemo(() => (q ? options.filter((o) => o.value !== "" && norm(o.label).includes(q)) : options), [options, q]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, uid]);

  function show() {
    if (disabled) return;
    const r = input.current?.getBoundingClientRect();
    setFlip(!!r && window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom);
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setQuery("");
  }
  function pick(i: number) {
    const o = shown[i];
    if (!o) return;
    onChange({ target: { value: o.value } });
    close();
    input.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp") {
        e.preventDefault();
        show();
      }
      return;
    }
    if (k === "ArrowDown") setActive((a) => Math.min(shown.length - 1, a + 1));
    else if (k === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (k === "Home" && !query) setActive(0);
    else if (k === "End" && !query) setActive(shown.length - 1);
    else if (k === "Enter") pick(active);
    else if (k === "Escape") {
      close();
      input.current?.blur();
    } else if (k === "Tab") close();
    else return;
    if (k !== "Tab") e.preventDefault();
  }

  return (
    <div ref={root} className={cn("relative h-11 w-full", className)}>
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && shown[active] ? `${uid}-opt-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={open ? query : (selected?.label ?? "")}
        placeholder={open ? "Type to search" : undefined}
        onFocus={show}
        onClick={() => !open && show()}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "h-full w-full border bg-surface pl-3 pr-10 text-base text-ink placeholder:text-subtle transition-colors",
          open ? "border-ink" : "border-line-strong hover:border-subtle",
          "focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-subtle",
          !open && !selected?.value && "text-muted",
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => (open ? close() : (input.current?.focus(), show()))}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted disabled:text-subtle"
      >
        <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <FadeScroll
          className={cn("absolute left-0 z-40 max-h-72 min-w-full border border-ink bg-surface shadow-pop", flip ? "bottom-full mb-1" : "top-full mt-1")}
          innerClassName="max-h-72 py-1"
        >
          <ul id={listId} role="listbox" aria-label={ariaLabel}>
            {shown.length === 0 && <li className="px-3 py-3 text-base text-muted">No match for “{query}”</li>}
            {shown.map((o, i) => (
              <li
                key={o.value + i}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                onPointerDown={(e) => e.preventDefault()}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-base",
                  i === active && "bg-surface-2",
                  o.value === value && "font-semibold",
                  !o.value && "text-muted",
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="size-4 shrink-0" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </FadeScroll>
      )}
    </div>
  );
}
