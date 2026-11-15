/**
 * The mark: four rising tally strokes crossed by the fifth, the counting gate.
 * Every vote counted, and the count rising as stations report.
 * "tile" is the navy square for light surfaces; "inverse" is the white square for the navy desk bar.
 */
export function BrandMark({ variant = "tile", className }: { variant?: "tile" | "inverse"; className?: string }) {
  const inverse = variant === "inverse";
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
      <rect width="72" height="72" fill={inverse ? "#ffffff" : "#00246b"} />
      <g fill={inverse ? "#00246b" : "#ffffff"}>
        <rect x="15" y="39" width="7" height="19" />
        <rect x="26" y="31" width="7" height="27" />
        <rect x="37" y="23" width="7" height="35" />
        <rect x="48" y="15" width="7" height="43" />
      </g>
      <path d="M11 52L62 22" stroke={inverse ? "#16653d" : "#4cc690"} strokeWidth="6" />
    </svg>
  );
}
