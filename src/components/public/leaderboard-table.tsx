"use client";

import { useMemo, useState } from "react";
import type {
  LbBattingRow,
  LbBowlingRow,
  LbOverallRow,
  LbTeamRef,
} from "@/lib/leaderboard-types";
import { fmtRate, shortName } from "@/lib/format";
import { RoleAvatar, TeamLogo } from "./atoms";
import { ChevR, Icon, IC } from "./icons";

type Tab = "Batting" | "Bowling" | "Overall";

/**
 * Leaderboard (boards/leaderboard.jsx): desktop full table, mobile ranking
 * cards with an expandable details grid. Gold ranks for the top 3; the
 * tab decides the bat/ball glyph on every avatar.
 */
export function LeaderboardTable({
  batting,
  bowling,
  overall,
  teams,
}: {
  batting: LbBattingRow[];
  bowling: LbBowlingRow[];
  overall: LbOverallRow[];
  teams: LbTeamRef[];
}) {
  const [tab, setTab] = useState<Tab>("Batting");
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const source: (LbBattingRow | LbBowlingRow | LbOverallRow)[] =
      tab === "Batting" ? batting : tab === "Bowling" ? bowling : overall;
    const q = search.trim().toLowerCase();
    return source.filter(
      (r) =>
        (teamId === "all" || r.team?.id === teamId) &&
        (q === "" || r.name.toLowerCase().includes(q)),
    );
  }, [tab, search, teamId, batting, bowling, overall]);

  const glyph = tab === "Bowling" ? ("ball" as const) : ("bat" as const);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toolbar: search · team filter · tabs */}
      <div className="max-md:flex max-md:flex-col md:flex md:flex-row md:items-center" style={{ gap: 10 }}>
        <span className="input" style={{ flex: "0 0 auto", minWidth: 0, width: "100%", maxWidth: 260 }}>
          <span style={{ color: "var(--muted)" }}>
            <Icon d={IC.search} size={15} />
          </span>
          <input
            type="search"
            placeholder="Search player…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search player"
          />
        </span>
        <span className="input" style={{ flex: "0 0 auto", width: "100%", maxWidth: 190 }}>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Filter by team">
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevR />
        </span>
        <span className="tabs md:ml-auto" role="tablist" aria-label="Leaderboard category" style={{ alignSelf: "flex-start" }}>
          {(["Batting", "Bowling", "Overall"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === tab}
              className="tab"
              {...(t === tab ? { "data-active": "" } : {})}
              onClick={() => { setTab(t); setExpanded(null); }}
            >
              {t}
            </button>
          ))}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <Icon d={IC.trophy} size={20} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {search || teamId !== "all" ? "No players match the filters" : "Rankings appear after the first completed match"}
          </span>
          {(search || teamId !== "all") && (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => { setSearch(""); setTeamId("all"); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card max-md:hidden" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              {tab === "Batting" && <BattingTable rows={rows as LbBattingRow[]} glyph={glyph} />}
              {tab === "Bowling" && <BowlingTable rows={rows as LbBowlingRow[]} glyph={glyph} />}
              {tab === "Overall" && <OverallTable rows={rows as LbOverallRow[]} glyph={glyph} />}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
              <MobileCard
                key={r.playerId}
                row={r}
                tab={tab}
                glyph={glyph}
                expanded={expanded === r.playerId}
                onToggle={() => setExpanded(expanded === r.playerId ? null : r.playerId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlayerCell({
  row,
  glyph,
}: {
  row: { name: string; photoUrl: string | null; team: LbTeamRef | null };
  glyph: "bat" | "ball";
}) {
  return (
    <span className="row" style={{ gap: 9 }}>
      <RoleAvatar name={row.name} size={28} color={row.team?.primaryColor} role={glyph} photoUrl={row.photoUrl} />
      <span style={{ fontWeight: 600 }}>{shortName(row.name)}</span>
    </span>
  );
}

function TeamCell({ team }: { team: LbTeamRef | null }) {
  if (!team) return <span style={{ color: "var(--muted)" }}>—</span>;
  return (
    <span className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}>
      <TeamLogo team={team} size="sm" />
      {team.name}
    </span>
  );
}

function RankCell({ rank }: { rank: number }) {
  return (
    <td className="t-num" style={{ fontWeight: 800, color: rank <= 3 ? "var(--highlight)" : "var(--muted)" }}>
      {rank}
    </td>
  );
}

function BattingTable({ rows, glyph }: { rows: LbBattingRow[]; glyph: "bat" | "ball" }) {
  return (
    <table className="stat">
      <thead>
        <tr>
          <th style={{ width: 50 }}>Rank</th><th>Player</th><th>Team</th>
          <th className="num">M</th><th className="num">Runs</th><th className="num">Balls</th>
          <th className="num">SR</th><th className="num">Avg</th><th className="num">4s</th>
          <th className="num">6s</th><th className="num">HS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} className={r.rank === 1 ? "hl" : ""}>
            <RankCell rank={r.rank} />
            <td><PlayerCell row={r} glyph={glyph} /></td>
            <td><TeamCell team={r.team} /></td>
            <td className="num">{r.matches}</td>
            <td className="num" style={{ fontWeight: 700 }}>{r.runs}</td>
            <td className="num">{r.balls}</td>
            <td className="num">{fmtRate(r.strikeRate, 1)}</td>
            <td className="num">{fmtRate(r.average, 1)}</td>
            <td className="num">{r.fours}</td>
            <td className="num">{r.sixes}</td>
            <td className="num">{r.highest}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BowlingTable({ rows, glyph }: { rows: LbBowlingRow[]; glyph: "bat" | "ball" }) {
  return (
    <table className="stat">
      <thead>
        <tr>
          <th style={{ width: 50 }}>Rank</th><th>Player</th><th>Team</th>
          <th className="num">Overs</th><th className="num">Runs</th><th className="num">Wkts</th>
          <th className="num">Econ</th><th className="num">Avg</th><th className="num">SR</th>
          <th className="num">Best</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} className={r.rank === 1 ? "hl" : ""}>
            <RankCell rank={r.rank} />
            <td><PlayerCell row={r} glyph={glyph} /></td>
            <td><TeamCell team={r.team} /></td>
            <td className="num">{r.overs}</td>
            <td className="num">{r.runsConceded}</td>
            <td className="num" style={{ fontWeight: 700 }}>{r.wickets}</td>
            <td className="num">{fmtRate(r.economy)}</td>
            <td className="num">{fmtRate(r.average, 1)}</td>
            <td className="num">{fmtRate(r.strikeRate, 1)}</td>
            <td className="num">{r.best ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OverallTable({ rows, glyph }: { rows: LbOverallRow[]; glyph: "bat" | "ball" }) {
  return (
    <table className="stat">
      <thead>
        <tr>
          <th style={{ width: 50 }}>Rank</th><th>Player</th><th>Team</th>
          <th className="num">M</th><th className="num">Batting Pts</th><th className="num">Bowling Pts</th>
          <th className="num">Fielding Pts</th><th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId} className={r.rank === 1 ? "hl" : ""}>
            <RankCell rank={r.rank} />
            <td><PlayerCell row={r} glyph={glyph} /></td>
            <td><TeamCell team={r.team} /></td>
            <td className="num">{r.matches}</td>
            <td className="num">{r.battingPoints}</td>
            <td className="num">{r.bowlingPoints}</td>
            <td className="num">{r.fieldingPoints}</td>
            <td className="num" style={{ fontWeight: 700 }}>{r.totalPoints}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MobileCard({
  row,
  tab,
  glyph,
  expanded,
  onToggle,
}: {
  row: LbBattingRow | LbBowlingRow | LbOverallRow;
  tab: Tab;
  glyph: "bat" | "ball";
  expanded: boolean;
  onToggle: () => void;
}) {
  const headline =
    tab === "Batting"
      ? { value: (row as LbBattingRow).runs, unit: "RUNS" }
      : tab === "Bowling"
        ? { value: (row as LbBowlingRow).wickets, unit: "WKTS" }
        : { value: (row as LbOverallRow).totalPoints, unit: "PTS" };

  const details: [string, string | number][] =
    tab === "Batting"
      ? (() => {
          const b = row as LbBattingRow;
          return [
            ["M", b.matches], ["Balls", b.balls], ["SR", fmtRate(b.strikeRate, 1)], ["Avg", fmtRate(b.average, 1)],
            ["4s", b.fours], ["6s", b.sixes], ["HS", b.highest], ["Runs", b.runs],
          ];
        })()
      : tab === "Bowling"
        ? (() => {
            const b = row as LbBowlingRow;
            return [
              ["M", b.matches], ["Overs", b.overs], ["Runs", b.runsConceded], ["Econ", fmtRate(b.economy)],
              ["Avg", fmtRate(b.average, 1)], ["SR", fmtRate(b.strikeRate, 1)], ["Best", b.best ?? "—"], ["Wkts", b.wickets],
            ];
          })()
        : (() => {
            const o = row as LbOverallRow;
            return [
              ["M", o.matches], ["Bat", o.battingPoints], ["Bowl", o.bowlingPoints], ["Field", o.fieldingPoints],
              ["PoM", o.playerOfMatchCount], ["Total", o.totalPoints],
            ];
          })();

  return (
    <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "none" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="row"
        style={{ gap: 11, background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left", width: "100%" }}
      >
        <span className="t-num" style={{ width: 20, fontWeight: 800, fontSize: 15, color: row.rank <= 3 ? "var(--highlight)" : "var(--muted)" }}>
          {row.rank}
        </span>
        <RoleAvatar name={row.name} size={36} color={row.team?.primaryColor} role={glyph} photoUrl={row.photoUrl} />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{shortName(row.name)}</span>
          {row.team && (
            <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--muted)" }}>
              <TeamLogo team={row.team} size="sm" />
              {row.team.name}
            </span>
          )}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="t-num" style={{ fontWeight: 800, fontSize: 18 }}>
            {headline.value}
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", marginLeft: 3 }}>{headline.unit}</span>
          </span>
          <span style={{ color: "var(--muted)", transform: expanded ? "rotate(90deg)" : "none", display: "inline-flex", transition: "transform .15s" }}>
            <ChevR />
          </span>
        </span>
      </button>
      {expanded && (
        <div className="grid grid-cols-4" style={{ gap: 8, background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
          {details.map(([l, v]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span className="t-label" style={{ fontSize: 9.5 }}>{l}</span>
              <span className="t-num" style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
