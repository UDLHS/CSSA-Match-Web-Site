"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  LbBattingRow,
  LbBowlingRow,
  LbOverallRow,
} from "@/lib/leaderboard-types";
import { shortName } from "@/lib/format";
import { RoleAvatar, TeamLogo } from "./atoms";

type Tab = "Batting" | "Bowling" | "Overall";

/** Home leaderboard preview — top 5 with pill tabs (boards/home.jsx). */
export function LeaderboardPreview({
  batting,
  bowling,
  overall,
}: {
  batting: LbBattingRow[];
  bowling: LbBowlingRow[];
  overall: LbOverallRow[];
}) {
  const [tab, setTab] = useState<Tab>("Batting");

  const rows =
    tab === "Batting"
      ? batting.slice(0, 5).map((r) => ({ ...head(r), value: r.runs, unit: "RUNS" }))
      : tab === "Bowling"
        ? bowling.slice(0, 5).map((r) => ({ ...head(r), value: r.wickets, unit: "WKTS" }))
        : overall.slice(0, 5).map((r) => ({ ...head(r), value: r.totalPoints, unit: "PTS" }));

  const glyph = tab === "Bowling" ? ("ball" as const) : ("bat" as const);

  return (
    <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Leaderboard preview">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h3 className="t-h3">Leaderboard</h3>
        <span className="tabs" role="tablist" aria-label="Leaderboard category">
          {(["Batting", "Bowling", "Overall"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              className="tab"
              {...(t === tab ? { "data-active": "" } : {})}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </span>
      </div>
      <div>
        {rows.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--muted)", padding: "10px 0" }}>
            Rankings appear after the first completed match.
          </p>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.playerId}
              className="row"
              style={{ gap: 12, padding: "9px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <span
                className="t-num"
                style={{ width: 18, fontWeight: 700, color: r.rank === 1 ? "var(--highlight)" : "var(--muted)", fontSize: 14 }}
              >
                {r.rank}
              </span>
              <RoleAvatar name={r.name} size={32} color={r.teamColor} role={glyph} photoUrl={r.photoUrl} />
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{shortName(r.name)}</span>
                {r.team && (
                  <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--muted)" }}>
                    <TeamLogo team={r.team} size="sm" />
                    {r.team.name}
                  </span>
                )}
              </span>
              <span className="t-num" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 16 }}>
                {r.value}
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", marginLeft: 4 }}>{r.unit}</span>
              </span>
            </div>
          ))
        )}
      </div>
      <Link href="/leaderboard" className="btn btn-soft btn-sm" style={{ justifyContent: "center", textDecoration: "none" }}>
        View full leaderboard
      </Link>
    </section>
  );
}

function head(r: LbBattingRow | LbBowlingRow | LbOverallRow) {
  return {
    playerId: r.playerId,
    rank: r.rank,
    name: r.name,
    photoUrl: r.photoUrl,
    team: r.team,
    teamColor: r.team?.primaryColor,
  };
}
