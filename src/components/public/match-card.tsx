"use client";

import type { LiveSnapshotRead, SnapshotTeam } from "@/lib/live-types";
import { fmtDateShort, fmtDateTime } from "@/lib/format";
import { StatusBadge, TeamLogo, type BadgeStatus } from "./atoms";
import { ChevR } from "./icons";
import { useLiveSnapshot } from "./use-live-snapshot";

/**
 * One match card (boards/home.jsx → MatchCard), fed by a ScoreSnapshot.
 *
 * For matches in play (LIVE / INNINGS_BREAK) the card subscribes to the same
 * SSE stream as the hero so the score updates ball-by-ball — without any
 * extra polling on the home page itself.
 */
export function MatchCard({
  snap: initial,
  onOpen,
}: {
  snap: LiveSnapshotRead;
  onOpen: (matchId: string) => void;
}) {
  const { snap: live } = useLiveSnapshot(initial);
  const snap = live ?? initial;
  const p = snap.payload;
  const { home, away } = p.teams;

  const scoreOf = (team: SnapshotTeam | null) => {
    if (!team) return { score: "—", overs: "" };
    const list = p.innings.filter((i) => i.battingTeamId === team.id);
    if (list.length === 0) return { score: "—", overs: "" };
    const last = list[list.length - 1];
    return { score: `${last.runs}/${last.wickets}`, overs: `(${last.oversDisplay})` };
  };

  const meta =
    p.status === "UPCOMING"
      ? fmtDateTime(p.scheduledAt)
      : p.status === "LIVE" || p.status === "INNINGS_BREAK"
        ? (p.venue?.name ?? "")
        : `${fmtDateShort(p.scheduledAt)}${p.venue ? ` · ${p.venue.name}` : ""}`;

  let footer: string;
  let footerTone: string = "var(--muted)";
  if (p.status === "COMPLETED" || p.status === "ABANDONED") {
    footer = p.result?.text ?? "Result pending";
    footerTone = p.status === "COMPLETED" ? "var(--success)" : "var(--muted)";
  } else if (p.live) {
    const batting = p.live.battingTeamId === home?.id ? home : away;
    footer =
      p.live.target != null && p.live.runsNeeded != null && p.live.ballsRemaining != null
        ? `${batting?.name ?? "Chasing side"} need ${p.live.runsNeeded} off ${p.live.ballsRemaining} balls`
        : `${batting?.name ?? "Batting side"} batting · ${ordinal(p.live.inningsNumber)} innings`;
  } else {
    footer = [`Match ${p.matchNumber}`, p.format, p.venue?.name].filter(Boolean).join(" · ");
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(p.matchId)}
      className="card"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        width: "100%",
      }}
      aria-label={`Open scorecard: ${home?.name ?? ""} vs ${away?.name ?? ""}`}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <StatusBadge status={p.status as BadgeStatus} />
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{meta}</span>
      </div>
      {[home, away].map((team) => {
        if (!team) return null;
        const s = scoreOf(team);
        return (
          <div key={team.id} className="row" style={{ justifyContent: "space-between" }}>
            <span className="row" style={{ gap: 9, minWidth: 0 }}>
              <TeamLogo team={team} />
              <span style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {team.name}
              </span>
            </span>
            <span className="t-num" style={{ fontWeight: 700, fontSize: 15, flex: "none" }}>
              {s.score}{" "}
              <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12 }}>{s.overs}</span>
            </span>
          </div>
        );
      })}
      <div className="divider" />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: footerTone, fontWeight: 600 }}>{footer}</span>
        <span style={{ color: "var(--primary)" }}><ChevR /></span>
      </div>
    </button>
  );
}

function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
