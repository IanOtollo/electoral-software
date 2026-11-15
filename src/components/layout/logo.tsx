import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/brand-mark";

/** The brand lockup for light surfaces: the mark and the name. One place, so every page stays in step. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-sm font-semibold leading-tight tracking-tight text-ink", className)}>
      <BrandMark className="size-7 shrink-0" />
      <span>
        Campaign
        <br />
        Management System
      </span>
    </span>
  );
}
