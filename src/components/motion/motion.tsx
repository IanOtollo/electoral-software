import type { ReactNode } from "react";

/**
 * Motion that can never hide or falsify content. Everything is plain HTML that is
 * visible immediately; animation is added by CSS only (see globals.css), so it works
 * before JavaScript loads, with JavaScript off, and is removed for reduced-motion.
 */

/** Eases up into place as it scrolls into view (browsers without scroll-driven animation just show it). */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`reveal ${className ?? ""}`}>{children}</div>;
}

/** Direct children ease in one after another on load. */
export function Stagger({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" | "section" }) {
  return <Tag className={`stagger ${className ?? ""}`}>{children}</Tag>;
}

export function StaggerItem({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  return <Tag className={className}>{children}</Tag>;
}

/** A bar drawn at its true width from the start, then swept in by CSS. */
export function GrowBar({ percent, className }: { percent: number; className?: string }) {
  return <div className={`grow-bar ${className ?? ""}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />;
}
