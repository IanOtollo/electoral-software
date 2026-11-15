import { cn } from "@/lib/utils";

/**
 * Single place the brand lives. Interim wordmark: swapped for the final mark in
 * the brand phase without touching any page.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-sm font-semibold leading-tight tracking-tight text-ink", className)}>
      Campaign
      <br />
      Management System
    </span>
  );
}
