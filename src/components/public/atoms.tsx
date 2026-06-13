/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { Icon, IC, RoleGlyph, type ActivityRole } from "./icons";

/**
 * Board-faithful public atoms (sample design/boards/shared.jsx is the truth).
 * Team colors appear ONLY here (logos/avatars) — CLAUDE.md rule 7.
 */

export interface TeamLite {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export function TeamLogo({
  team,
  size,
}: {
  team: TeamLite;
  size?: "sm" | "lg";
}) {
  const cls =
    "tlogo" + (size === "lg" ? " tlogo-lg" : size === "sm" ? " tlogo-sm" : "");
  if (team.logoUrl) {
    return (
      <span className={cls} style={{ background: "var(--surface-2)" }}>
        <img src={team.logoUrl} alt={team.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </span>
    );
  }
  return (
    <span className={cls} style={{ background: team.primaryColor }} aria-label={team.name}>
      {team.shortName}
    </span>
  );
}

export type BadgeStatus =
  | "LIVE"
  | "UPCOMING"
  | "COMPLETED"
  | "INNINGS_BREAK"
  | "ABANDONED"
  | "FREE_HIT";

const BADGE_MAP: Record<BadgeStatus, { cls: string; label: string }> = {
  LIVE: { cls: "badge-live", label: "LIVE" },
  UPCOMING: { cls: "badge-upcoming", label: "Upcoming" },
  COMPLETED: { cls: "badge-completed", label: "Completed" },
  INNINGS_BREAK: { cls: "badge-break", label: "Innings break" },
  ABANDONED: { cls: "badge-abandoned", label: "Abandoned" },
  FREE_HIT: { cls: "badge-freehit", label: "⚡ Free hit" },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { cls, label } = BADGE_MAP[status];
  return (
    <span className={`badge ${cls}`}>
      {status === "LIVE" && <span className="pulse" />}
      {label}
    </span>
  );
}

/** v: "0" "1".."6" "W" "WD" "NB" — color-coded ball dot. */
export function Ball({
  v,
  sm,
  ariaLabel,
}: {
  v: string;
  sm?: boolean;
  ariaLabel?: string;
}) {
  let cls = "ball";
  if (v === "4") cls += " ball-four";
  else if (v === "6") cls += " ball-six";
  else if (v === "W") cls += " ball-w";
  else if (v === "WD" || v === "NB") cls += " ball-" + v.toLowerCase();
  else if (v !== "0" && v !== "·") cls += " ball-run";
  if (sm) cls += " ball-sm";
  return (
    <span className={cls} aria-label={ariaLabel} role={ariaLabel ? "img" : undefined}>
      {v === "0" ? "•" : v}
    </span>
  );
}

export function BallStrip({
  balls,
  sm,
  live,
}: {
  balls: { overBall: string; label: string }[];
  sm?: boolean;
  live?: boolean;
}) {
  return (
    <span
      className="ball-strip"
      aria-live={live ? "polite" : undefined}
      aria-label="Last balls"
    >
      {balls.map((b, i) => (
        <Ball key={`${b.overBall}-${i}`} v={b.label} sm={sm} ariaLabel={`over ${b.overBall}: ${ballWord(b.label)}`} />
      ))}
    </span>
  );
}

function ballWord(label: string): string {
  switch (label) {
    case "0": return "dot ball";
    case "4": return "four";
    case "6": return "six";
    case "W": return "wicket";
    case "WD": return "wide";
    case "NB": return "no ball";
    default: return `${label} runs`;
  }
}

export function initials(name: string, max = 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, max)
    .join("");
}

export function Avatar({
  name,
  size = 40,
  color,
  photoUrl,
}: {
  name: string;
  size?: number;
  color?: string;
  photoUrl?: string | null;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.34,
  };
  if (color) {
    style.background = `color-mix(in oklab, ${color} 14%, var(--surface))`;
    style.color = color;
    style.borderColor = `color-mix(in oklab, ${color} 34%, var(--border))`;
  }
  return (
    <span className="avatar" style={style}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** Colored disc with a bat/ball glyph — hero current-player rows. */
export function RoleIconDisc({
  role,
  size = 22,
}: {
  role: ActivityRole;
  size?: number;
}) {
  return (
    <span className={`role-disc ${role}`} style={{ width: size, height: size }}>
      {role === "field" ? (
        <Icon d={IC.user} size={size * 0.56} />
      ) : (
        <RoleGlyph role={role} size={size * 0.6} />
      )}
    </span>
  );
}

/** Avatar with the activity badge in the corner (bat/ball; none = fielding). */
export function RoleAvatar({
  name,
  size = 40,
  color,
  role,
  photoUrl,
}: {
  name: string;
  size?: number;
  color?: string;
  role?: ActivityRole;
  photoUrl?: string | null;
}) {
  const bs = Math.max(15, Math.round(size * 0.46));
  return (
    <span className="role-av">
      <Avatar name={name} size={size} color={color} photoUrl={photoUrl} />
      {role && role !== "field" ? (
        <span className={`role-badge ${role}`} style={{ width: bs, height: bs }}>
          <RoleGlyph role={role} size={bs * 0.62} />
        </span>
      ) : null}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="t-label">{label}</span>
      <span className="t-num" style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
      {sub ? <span className="t-small" style={{ color: "var(--muted)" }}>{sub}</span> : null}
    </div>
  );
}

/** Sponsor inventory slot — placeholder until the ads table feeds it (Phase 5). */
export function SponsorSlot({
  variant,
}: {
  variant: "leaderboard" | "skyscraper" | "banner";
}) {
  const sky = variant === "skyscraper";
  const label =
    variant === "leaderboard"
      ? "Leaderboard · 728×90"
      : sky
        ? "Skyscraper · 160×600"
        : "Banner · 320×100";
  return (
    <div
      className="sponsor-slot-bg"
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        minHeight: variant === "leaderboard" ? 104 : variant === "banner" ? 90 : 0,
        height: sky ? "100%" : undefined,
        display: "flex",
        flexDirection: sky ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        overflow: "hidden",
        padding: sky ? "26px 16px" : "0 22px",
      }}
    >
      <span className="sponsor-tag">Sponsor slot</span>
      <span
        style={{
          width: sky ? 56 : 46,
          height: sky ? 56 : 46,
          borderRadius: 12,
          background: "var(--surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
          flex: "none",
        }}
      >
        <Icon d={IC.image} size={sky ? 24 : 22} />
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: sky ? "center" : "flex-start",
          gap: 2,
          textAlign: sky ? "center" : "left",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Your brand here</span>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</span>
      </span>
    </div>
  );
}
