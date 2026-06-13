import { cn } from "@/lib/utils";

/**
 * BallDot — color-coded ball-by-ball dot (design spec, fixed in both themes):
 *   dot/0 → surface-2 + muted · 1–3 → surface-2 + text · 4 → blue · 6 → violet
 *   W → danger · WD/NB → amber-tint outline
 */
export type BallValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "W"
  | "WD"
  | "NB"
  | "B"
  | "LB"
  | "·";

export interface BallDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: BallValue;
  size?: "sm" | "md";
  /** e.g. "over 16.2: six" — read out for screen readers */
  label?: string;
}

function colorClasses(value: BallValue): string {
  switch (value) {
    case "4":
      return "bg-ball-four text-on-ink border-transparent";
    case "6":
      return "bg-ball-six text-on-ink border-transparent";
    case "W":
      return "bg-danger text-on-ink border-transparent";
    case "WD":
    case "NB":
      return "bg-[color-mix(in_oklab,var(--warn)_18%,transparent)] text-warn border-[color-mix(in_oklab,var(--warn)_40%,transparent)]";
    case "0":
    case "·":
      return "bg-surface-2 text-muted border-border";
    default:
      return "bg-surface-2 text-foreground border-border";
  }
}

export function BallDot({
  value,
  size = "md",
  label,
  className,
  ...props
}: BallDotProps) {
  return (
    <span
      role="img"
      aria-label={label ?? `ball: ${value === "0" || value === "·" ? "dot ball" : value}`}
      className={cn(
        "tnum inline-flex flex-none items-center justify-center rounded-full border font-bold",
        size === "md" ? "size-7 text-xs" : "size-[22px] text-[10.5px]",
        colorClasses(value),
        className,
      )}
      {...props}
    >
      <span aria-hidden>{value === "0" ? "•" : value}</span>
    </span>
  );
}

export interface BallStripProps extends React.HTMLAttributes<HTMLSpanElement> {
  balls: { value: BallValue; label?: string }[];
  size?: "sm" | "md";
}

/** Last-6-balls strip — aria-live so score updates are announced politely. */
export function BallStrip({ balls, size, className, ...props }: BallStripProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-live="polite"
      {...props}
    >
      {balls.map((b, i) => (
        <BallDot key={i} value={b.value} label={b.label} size={size} />
      ))}
    </span>
  );
}
