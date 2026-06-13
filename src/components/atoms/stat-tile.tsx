import { cn } from "@/lib/utils";

/**
 * StatTile — uppercase label + tabular-nums value (+ optional sub line).
 * `reserveCh` keeps a fixed digit width so 99/2 → 100/2 causes ZERO layout shift.
 */
export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Minimum value width in `ch` (reserved digit width) */
  reserveCh?: number;
  /** Use on dark/ink surfaces (hero, summary strip) */
  onInk?: boolean;
}

export function StatTile({
  label,
  value,
  sub,
  reserveCh,
  onInk = false,
  className,
  ...props
}: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)} {...props}>
      <span
        className={cn(
          "text-[11px] font-semibold tracking-[0.09em] uppercase",
          onInk ? "text-on-ink-muted" : "text-muted",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tnum text-base font-bold",
          onInk ? "text-on-ink" : "text-foreground",
        )}
        style={reserveCh ? { minWidth: `${reserveCh}ch` } : undefined}
      >
        {value}
      </span>
      {sub != null && (
        <span
          className={cn(
            "text-[13px]",
            onInk ? "text-on-ink-muted" : "text-muted",
          )}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
