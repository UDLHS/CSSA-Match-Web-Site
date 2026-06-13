import { cn } from "@/lib/utils";
import { AvatarInitials } from "./avatar-initials";

/**
 * RoleAvatar — player avatar with a CURRENT-activity corner badge:
 *   bat glyph (primary) while batting · ball glyph (accent) while bowling ·
 *   no badge while fielding. (Design spec "Role indicator".)
 */
export type ActivityRole = "bat" | "ball" | "field";

function BatGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5.6 18.4 12.2 11.8"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M13.4 10.6 17.9 6.1"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BallGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M8.7 4.9C10.8 8 10.8 16 8.7 19.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.6 7.1l1.3.5M6 9.5l1.4.4M5.8 12h1.5M6 14.5l1.4-.4M6.6 16.9l1.3-.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface RoleAvatarProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  role?: ActivityRole;
  photoUrl?: string | null;
  color?: string;
  size?: number;
}

export function RoleAvatar({
  name,
  role = "field",
  photoUrl,
  color,
  size = 40,
  className,
  ...props
}: RoleAvatarProps) {
  const badgeSize = Math.max(15, Math.round(size * 0.46));
  const showBadge = role === "bat" || role === "ball";
  return (
    <span
      className={cn("relative inline-flex flex-none", className)}
      {...props}
    >
      <AvatarInitials name={name} photoUrl={photoUrl} color={color} size={size} />
      {showBadge && (
        <span
          aria-label={role === "bat" ? `${name} is batting` : `${name} is bowling`}
          role="img"
          className={cn(
            "absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full border-2 border-surface text-on-primary shadow-card",
            role === "bat" ? "bg-primary" : "bg-accent",
          )}
          style={{ width: badgeSize, height: badgeSize }}
        >
          {role === "bat" ? (
            <BatGlyph size={Math.round(badgeSize * 0.62)} />
          ) : (
            <BallGlyph size={Math.round(badgeSize * 0.62)} />
          )}
        </span>
      )}
    </span>
  );
}
