/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/**
 * TeamLogo — uploaded logo, or a monogram disc in the team color as fallback.
 * Team colors are allowed ONLY here and in avatars (color discipline).
 */
export interface TeamLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Short name, max 4 chars — e.g. "CST" */
  shortName: string;
  name?: string;
  /** Team primary color (data-driven, not a design token) */
  color?: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "size-[22px] text-[9px]",
  md: "size-[34px] text-[13px]",
  lg: "size-[52px] text-[19px]",
} as const;

export function TeamLogo({
  shortName,
  name,
  color,
  logoUrl,
  size = "md",
  className,
  ...props
}: TeamLogoProps) {
  const title = name ?? shortName;
  if (logoUrl) {
    return (
      <span
        className={cn(
          "inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-surface-2",
          SIZES[size],
          className,
        )}
        {...props}
      >
        <img
          src={logoUrl}
          alt={`${title} logo`}
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={`${title} logo`}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-display font-bold tracking-[0.03em] text-on-ink",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color ?? "var(--ink)" }}
      {...props}
    >
      <span aria-hidden>{shortName.slice(0, 4).toUpperCase()}</span>
    </span>
  );
}
