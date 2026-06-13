import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * StatusBadge — match/innings status pills.
 * Red is reserved for LIVE; gold is reserved for FREE HIT (color discipline).
 * Status is never color-only: every badge carries text.
 */
const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase leading-relaxed tracking-[0.08em] whitespace-nowrap",
  {
    variants: {
      status: {
        live: "bg-live text-on-ink",
        upcoming: "bg-primary-soft text-primary",
        completed:
          "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success",
        innings_break:
          "bg-[color-mix(in_oklab,var(--warn)_16%,transparent)] text-warn",
        abandoned: "bg-surface-2 text-muted",
        free_hit: "bg-highlight text-ink",
      },
    },
    defaultVariants: { status: "upcoming" },
  },
);

const DEFAULT_LABELS: Record<
  NonNullable<VariantProps<typeof statusBadge>["status"]>,
  string
> = {
  live: "Live",
  upcoming: "Upcoming",
  completed: "Completed",
  innings_break: "Innings break",
  abandoned: "Abandoned",
  free_hit: "⚡ Free hit",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadge> {}

export function StatusBadge({
  status,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadge({ status }), className)} {...props}>
      {status === "live" && (
        <span
          aria-hidden
          className="size-[7px] rounded-full bg-on-ink motion-safe:animate-[cf-pulse_1.4s_ease-in-out_infinite]"
        />
      )}
      {children ?? DEFAULT_LABELS[status ?? "upcoming"]}
    </span>
  );
}
