"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import type { LiveSnapshotRead, SnapshotTeam } from "@/lib/live-types";
import { fmtDateTime, fmtRate, shortName } from "@/lib/format";
import {
  BallStrip,
  RoleIconDisc,
  StatusBadge,
  TeamLogo,
  type BadgeStatus,
} from "./atoms";
import { ChevR, Icon, IC } from "./icons";
import { useLiveSnapshot } from "./use-live-snapshot";

/**
 * LiveMatchHero — the home page anchor (boards/home.jsx → LiveHero).
 * Ink gradient card; batting side full opacity, finished side dimmed;
 * stats strip; current players with activity discs; last-6 dot strip.
 * Score digits use tabular-nums with reserved width — zero layout shift.
 */
export function LiveHero({ initial }: { initial: LiveSnapshotRead | null }) {
  const { snap, degraded } = useLiveSnapshot(initial);
  const router = useRouter();

  // When a match transitions out of play (LIVE → COMPLETED / ABANDONED), the
  // rest of the home page (Matches carousel, leaderboard preview) has stale
  // server-rendered data. Refresh so the just-finished match jumps into
  // "Previous" without the user having to reload.
  const lastStatus = useRef(snap?.status);
  useEffect(() => {
    const wasInPlay =
      lastStatus.current === "LIVE" || lastStatus.current === "INNINGS_BREAK";
    const nowDone =
      snap?.status === "COMPLETED" || snap?.status === "ABANDONED";
    if (wasInPlay && nowDone) router.refresh();
    lastStatus.current = snap?.status;
  }, [snap?.status, router]);

  if (!snap) {
    return (
      <div className="card" style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
          <Icon d={IC.clock} size={20} />
        </span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>No matches yet</span>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          The fixture list will appear here once the tournament is published.
        </span>
      </div>
    );
  }

  const p = snap.payload;
  const live = p.live;
  const { home, away } = p.teams;

  const inningsOf = (team: SnapshotTeam | null) =>
    team ? p.innings.filter((i) => i.battingTeamId === team.id) : [];

  const scoreOf = (team: SnapshotTeam | null) => {
    const list = inningsOf(team);
    if (list.length === 0) return null;
    const last = list[list.length - 1];
    return { score: `${last.runs}/${last.wickets}`, overs: `(${last.oversDisplay})` };
  };

  const battingTeamId = live?.battingTeamId ?? null;

  const tossText = p.toss
    ? `${(p.toss.wonByTeamId === home?.id ? home : away)?.name ?? "—"} won the toss & elected to ${p.toss.decision === "BAT" ? "bat" : "bowl"}`
    : null;

  const meta = [
    `Match ${p.matchNumber}`,
    p.format,
    p.venue?.name,
  ]
    .filter(Boolean)
    .join(" · ");

  const needLine =
    live && live.target != null && live.runsNeeded != null && live.ballsRemaining != null
      ? `${live.runsNeeded} off ${live.ballsRemaining}`
      : "—";

  const stats: [string, string][] = [
    ["Target", live?.target != null ? String(live.target) : "—"],
    ["Need", needLine],
    ["CRR", fmtRate(live?.currentRunRate ?? null)],
    ["RRR", fmtRate(live?.requiredRunRate ?? null)],
  ];

  const players: { role: string; name: string; fig: string; rt: "bat" | "ball" }[] = [];
  if (live?.striker) {
    players.push({
      role: "Striker",
      name: shortName(live.striker.name),
      fig: `${live.striker.runs}* (${live.striker.balls})`,
      rt: "bat",
    });
  }
  if (live?.nonStriker) {
    players.push({
      role: "Non-striker",
      name: shortName(live.nonStriker.name),
      fig: `${live.nonStriker.runs}* (${live.nonStriker.balls})`,
      rt: "bat",
    });
  }
  if (live?.bowler) {
    players.push({
      role: "Bowler",
      name: shortName(live.bowler.name),
      fig: `${live.bowler.wickets}/${live.bowler.runsConceded} · ${live.bowler.oversDisplay} ov`,
      rt: "ball",
    });
  }

  return (
    <section
      aria-label="Featured match"
      style={{
        background: "var(--hero-grad)",
        borderRadius: 16,
        padding: "clamp(18px, 3vw, 30px)",
        color: "var(--on-ink)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <StatusBadge status={p.status as BadgeStatus} />
          {live?.freeHitPending && <StatusBadge status="FREE_HIT" />}
          <span style={{ fontSize: 12, color: "var(--on-ink-muted)", fontWeight: 600 }}>{meta}</span>
        </span>
        {tossText && (
          <span className="max-md:hidden" style={{ fontSize: 12, color: "var(--on-ink-muted)" }}>
            {tossText}
          </span>
        )}
      </div>

      {/* Teams — desktop 3-col, mobile stacked */}
      <div
        className="max-md:flex max-md:flex-col max-md:gap-3.5 md:grid md:items-center md:gap-6"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <HeroTeam
          team={home}
          score={scoreOf(home)}
          dim={battingTeamId !== null && battingTeamId !== home?.id}
          status={p.status}
          scheduledAt={p.scheduledAt}
        />
        <span
          className="max-md:hidden"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--on-ink-muted)", textAlign: "center" }}
        >
          VS
        </span>
        <HeroTeam
          team={away}
          score={scoreOf(away)}
          dim={battingTeamId !== null && battingTeamId !== away?.id}
          status={p.status}
          scheduledAt={p.scheduledAt}
          right
        />
      </div>

      {/* Stats strip (in play) / result line (finished) / schedule (upcoming) */}
      {live ? (
        <div
          className="grid max-md:grid-cols-4 md:flex md:gap-9"
          style={{
            gap: 10,
            background: "rgba(255,255,255,.07)",
            borderRadius: 12,
            padding: "12px 22px",
          }}
          aria-live="polite"
        >
          {stats.map(([l, v]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span className="t-label" style={{ color: "var(--on-ink-muted)" }}>{l}</span>
              <span className="t-num" style={{ fontSize: 17, fontWeight: 700, minWidth: "4ch" }}>{v}</span>
            </span>
          ))}
        </div>
      ) : p.result?.text ? (
        <div
          className="row"
          style={{ gap: 10, background: "rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 22px" }}
        >
          <span style={{ color: "var(--highlight)" }}><Icon d={IC.trophy} size={18} /></span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{p.result.text}</span>
          {p.result.playerOfMatch && (
            <span style={{ fontSize: 12, color: "var(--on-ink-muted)" }}>
              · Player of the match: {p.result.playerOfMatch.name}
            </span>
          )}
        </div>
      ) : (
        <div
          className="row"
          style={{ gap: 10, background: "rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 22px" }}
        >
          <span style={{ color: "var(--on-ink-muted)" }}><Icon d={IC.calendar} size={16} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtDateTime(p.scheduledAt)}</span>
          {p.venue && (
            <span style={{ fontSize: 12, color: "var(--on-ink-muted)" }}>· {p.venue.name}, {p.venue.location}</span>
          )}
        </div>
      )}

      {/* Current players + last balls + CTA */}
      {(players.length > 0 || live) && (
        <div
          className="max-md:flex max-md:flex-col max-md:gap-3 md:grid md:items-end md:gap-4"
          style={{ gridTemplateColumns: "1fr auto" }}
        >
          <div className="max-md:flex max-md:flex-col max-md:gap-2.5 md:flex md:flex-row md:gap-6" aria-live="polite">
            {players.map((pl) => (
              <span key={pl.role} className="row" style={{ gap: 9 }}>
                <RoleIconDisc role={pl.rt} size={22} />
                <span style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{pl.name}</span>
                  <span className="t-num" style={{ color: "var(--on-ink-muted)" }}> · {pl.fig}</span>
                </span>
                <span className="t-label" style={{ color: "var(--on-ink-muted)", fontSize: 9.5 }}>{pl.role}</span>
              </span>
            ))}
          </div>
          <div className="row" style={{ gap: 12, justifyContent: "space-between" }}>
            {live && live.lastBalls.length > 0 && <BallStrip balls={live.lastBalls} live sm />}
            <Link
              href={`/matches/${p.matchId}`}
              className="btn btn-sm btn-gold"
              style={{ textDecoration: "none" }}
            >
              Full scorecard <ChevR />
            </Link>
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        {tossText && (
          <span className="md:hidden" style={{ fontSize: 11.5, color: "var(--on-ink-muted)" }}>{tossText}</span>
        )}
        {degraded && (
          <span style={{ fontSize: 11, color: "var(--on-ink-muted)" }}>
            Connection lost — retrying, live data resumes automatically
          </span>
        )}
      </div>
    </section>
  );
}

function HeroTeam({
  team,
  score,
  dim,
  status,
  scheduledAt,
  right,
}: {
  team: SnapshotTeam | null;
  score: { score: string; overs: string } | null;
  dim: boolean;
  status: string;
  scheduledAt: string;
  right?: boolean;
}) {
  if (!team) return null;
  const style: CSSProperties = {
    gap: 14,
    opacity: dim ? 0.82 : 1,
    justifyContent: right ? "flex-end" : "flex-start",
  };
  const yetToBat = status === "LIVE" || status === "INNINGS_BREAK";
  return (
    <div className="row max-md:!justify-start" style={style}>
      {!right && <TeamLogo team={team} size="lg" />}
      {right && <span className="md:hidden"><TeamLogo team={team} size="lg" /></span>}
      <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: right ? "right" : "left" }}>
        <span className="max-md:!text-left" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--on-ink)" }}>{team.name}</span>
        <span
          className="t-score-lg md:!text-[56px] max-md:!text-left"
          style={{ color: "var(--on-ink)", minWidth: "6ch" }}
          aria-label={score ? `${team.name} ${score.score} in ${score.overs} overs` : undefined}
        >
          {score ? score.score : "—"}
          {score && (
            <span style={{ fontSize: 22, fontWeight: 600, color: "var(--on-ink-muted)", marginLeft: 6 }}>
              {score.overs}
            </span>
          )}
          {!score && yetToBat && (
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--on-ink-muted)", marginLeft: 8 }}>
              yet to bat
            </span>
          )}
        </span>
        {!score && !yetToBat && (
          <span style={{ fontSize: 11.5, color: "var(--on-ink-muted)" }}>
            {new Date(scheduledAt).toLocaleDateString("en-US", { weekday: "short" })}
          </span>
        )}
      </span>
      {right && <span className="max-md:hidden"><TeamLogo team={team} size="lg" /></span>}
    </div>
  );
}
