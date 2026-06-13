/* eslint-disable @next/next/no-img-element */
import { cn, initials } from "@/lib/utils";

/**
 * AvatarInitials — player photo, or initials disc tinted with the team color.
 * Team colors are allowed ONLY in logos/avatars (color discipline).
 */
export interface AvatarInitialsProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  photoUrl?: string | null;
  /** Team color used as a soft tint (data-driven) */
  color?: string;
  /** Diameter in px (default 40) */
  size?: number;
}

export function AvatarInitials({
  name,
  photoUrl,
  color,
  size = 40,
  className,
  style,
  ...props
}: AvatarInitialsProps) {
  const tinted = color
    ? {
        backgroundColor: `color-mix(in oklab, ${color} 14%, var(--surface))`,
        borderColor: `color-mix(in oklab, ${color} 35%, var(--border))`,
        color,
      }
    : undefined;
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex flex-none items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 font-bold text-muted",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        ...tinted,
        ...style,
      }}
      {...props}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
