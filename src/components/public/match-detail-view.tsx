"use client";

import { useEffect, useState } from "react";
import type {
  DetailInnings,
  MatchDetailDTO,
} from "@/lib/match-detail-types";
import { fmtDateTime, shortName } from "@/lib/format";
import { Ball, BallStrip, Stat, StatusBadge, TeamLogo, type BadgeStatus } from "./atoms";
import { Icon, IC } from "./icons";

const TABS = ["Summary", "Scorecard", "Fall of Wickets", "Ball-by-Ball", "Info"] as const;
type Tab = (typeof TABS)[number];

/**
 * Match details (boards/match.jsx): ink header, underline tabs,
 * Summary · Scorecard · Fall of Wickets · Ball-by-Ball · Info.
 * Polls the detail endpoint while the match is in play.
 */
export function MatchDetailView({ initial }: { initial: MatchDetailDTO }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("Summary");

  const inPlay = data.status === "LIVE" || data.status === "INNINGS_BREAK";

  useEffect(() => {
    if (!inPlay) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/matches/${data.matchId}/detail`, { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } catch {
        // keep the last payload; next tick retries (design-spec error rule)
      }
    }, 12_000);
    return () => clearInterval(id);
  }, [data.matchId, inPlay]);

  return (
    <div className="card" style={{ borderRadius: 16, overflow: "hidden", padding: 0, boxShadow: "var(--shadow-pop)" }}>
      <Header data={data} />
      <div
        className="tabs tabs-underline"
        role="tablist"
        aria-label="Match details"
        style={{ padding: "0 clamp(14px, 2.5vw, 24px)", gap: 0, overflowX: "auto" }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            className="tab"
            {...(t === tab ? { "data-active": "" } : {})}
            style={{ padding: "11px 12px", fontSize: 12.5, flex: "none" }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Summary" && <SummaryTab data={data} />}
      {tab === "Scorecard" && <ScorecardTab data={data} />}
      {tab === "Fall of Wickets" && <FowTab data={data} />}
      {tab === "Ball-by-Ball" && <BallByBallTab data={data} />}
      {tab === "Info" && <InfoTab data={data} />}
    </div>
  );
}

function scoreFor(data: MatchDetailDTO, teamId: string | undefined) {
  if (!teamId) return null;
  const list = data.innings.filter((i) => i.battingTeam.id === teamId);
  if (list.length === 0) return null;
  const last = list[list.length - 1];
  return { score: `${last.runs}/${last.wickets}`, overs: `(${last.oversDisplay})` };
}

function Header({ data }: { data: MatchDetailDTO }) {
  const { home, away } = data.teams;
  const hs = scoreFor(data, home?.id);
  const as = scoreFor(data, away?.id);
  return (
    <div
      style={{
        padding: "clamp(14px, 2.5vw, 20px) clamp(16px, 2.5vw, 24px)",
        background: "var(--hero-grad)",
        color: "var(--on-ink)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 10 }}>
          <StatusBadge status={data.status as BadgeStatus} />
          <span style={{ fontSize: 12, color: "var(--on-ink-muted)", fontWeight: 600 }}>
            Match {data.matchNumber} · {data.format}
            {data.stage ? ` · ${data.stage}` : ""}
          </span>
        </span>
      </div>
      <div className="row" style={{ justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        {home && (
          <span className="row" style={{ gap: 10 }}>
            <TeamLogo team={home} />
            <span className="t-score-md t-num">
              {hs ? hs.score : home.shortName}{" "}
              {hs && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--on-ink-muted)" }}>{hs.overs}</span>}
            </span>
          </span>
        )}
        <span style={{ fontFamily: "var(--font-display)", color: "var(--on-ink-muted)", fontWeight: 600 }}>VS</span>
        {away && (
          <span className="row" style={{ gap: 10 }}>
            <span className="t-score-md t-num">
              {as ? as.score : away.shortName}{" "}
              {as && <span style={{ fontSize: 13, fontWeight: 600, color: "var(--on-ink-muted)" }}>{as.overs}</span>}
            </span>
            <TeamLogo team={away} />
          </span>
        )}
      </div>
      {data.statusLine && (
        <span style={{ fontSize: 12, color: "var(--on-ink-muted)" }} aria-live="polite">
          {data.statusLine}
        </span>
      )}
    </div>
  );
}

function SummaryTab({ data }: { data: MatchDetailDTO }) {
  return (
    <div style={{ padding: "clamp(14px, 2.5vw, 24px)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ padding: 14, boxShadow: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-label">Status</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {data.statusLine ?? data.resultText ?? `Starts ${fmtDateTime(data.scheduledAt)}`}
        </span>
        {data.lastBalls.length > 0 && (
          <div className="row" style={{ gap: 8 }}>
            <BallStrip balls={data.lastBalls} sm live={data.status === "LIVE"} />
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>last 6 balls</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2" style={{ gap: 10 }}>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Toss" value={data.tossText ? data.tossText.split(" won")[0] : "—"} sub={data.tossText ? `elected to ${data.tossText.endsWith("bat") ? "bat" : "bowl"}` : "not yet"} />
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Top scorer" value={data.topScorer?.name ?? "—"} sub={data.topScorer?.line} />
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Best bowling" value={data.bestBowler?.name ?? "—"} sub={data.bestBowler?.line} />
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Venue" value={data.venue?.name ?? "—"} sub={data.venue?.location} />
        </div>
      </div>
      <div
        className="card row"
        style={{ padding: 14, boxShadow: "none", borderColor: "var(--highlight)", gap: 12 }}
      >
        <span style={{ color: "var(--highlight)" }}>
          <Icon d={IC.trophy} size={22} />
        </span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span className="t-label">Player of the match</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: data.playerOfMatch ? "var(--text)" : "var(--muted)" }}>
            {data.playerOfMatch?.name ?? "Announced after the match ends"}
          </span>
        </span>
        <span className="t-label" style={{ marginLeft: "auto", textAlign: "right", fontSize: 9.5 }}>
          Presented by
          <br />
          <span style={{ color: "var(--text)", fontWeight: 700 }}>Sponsor</span>
        </span>
      </div>
    </div>
  );
}

function InningsHeading({ inn, suffix }: { inn: DetailInnings; suffix: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <span className="row" style={{ gap: 8 }}>
        <TeamLogo team={inn.battingTeam} size="sm" />
        <span className="t-h3">
          {inn.battingTeam.name} — {suffix}
        </span>
      </span>
      <span className="t-num" style={{ fontWeight: 700 }}>
        {inn.runs}/{inn.wickets} ({inn.oversDisplay})
      </span>
    </div>
  );
}

function inningsLabel(n: number): string {
  return n === 1 ? "1st innings" : n === 2 ? "2nd innings" : `innings ${n}`;
}

function ScorecardTab({ data }: { data: MatchDetailDTO }) {
  if (data.innings.length === 0) return <EmptyTab text="The scorecard appears once the match starts." />;
  return (
    <div style={{ padding: "clamp(14px, 2.5vw, 24px)", display: "flex", flexDirection: "column", gap: 26 }}>
      {data.innings.map((inn) => (
        <div key={inn.inningsNumber} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <InningsHeading inn={inn} suffix={inningsLabel(inn.inningsNumber)} />
          <div style={{ overflowX: "auto" }}>
            <table className="stat">
              <thead>
                <tr>
                  <th>Batter</th>
                  <th className="max-md:hidden"></th>
                  <th className="num">R</th>
                  <th className="num">B</th>
                  <th className="num">4s</th>
                  <th className="num">6s</th>
                  <th className="num">SR</th>
                </tr>
              </thead>
              <tbody>
                {inn.batting.map((b) => (
                  <tr key={b.playerId}>
                    <td style={{ fontWeight: 600 }}>
                      {shortName(b.name)}
                      {b.notOut && <span style={{ color: "var(--success)" }}>*</span>}
                      <div className="md:hidden" style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>
                        {b.how}
                      </div>
                    </td>
                    <td className="max-md:hidden" style={{ color: "var(--muted)", fontSize: 12 }}>{b.how}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{b.runs}</td>
                    <td className="num">{b.balls}</td>
                    <td className="num">{b.fours}</td>
                    <td className="num">{b.sixes}</td>
                    <td className="num">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              background: "var(--surface-2)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <span>
              <b>Extras</b> {inn.extras.total}{" "}
              <span style={{ color: "var(--muted)" }}>
                (WD {inn.extras.wides}, NB {inn.extras.noBalls}, B {inn.extras.byes}, LB {inn.extras.legByes}
                {inn.extras.penalties > 0 ? `, PEN ${inn.extras.penalties}` : ""})
              </span>
            </span>
            <span className="t-num">
              <b>Total</b> {inn.runs}/{inn.wickets} · {inn.oversDisplay} overs · RR {inn.runRate}
            </span>
          </div>
          <span className="t-h3">Bowling — {inn.bowlingTeam.name}</span>
          <div style={{ overflowX: "auto" }}>
            <table className="stat">
              <thead>
                <tr>
                  <th>Bowler</th>
                  <th className="num">O</th>
                  <th className="num">M</th>
                  <th className="num">R</th>
                  <th className="num">W</th>
                  <th className="num">Econ</th>
                </tr>
              </thead>
              <tbody>
                {inn.bowling.map((b) => (
                  <tr key={b.playerId}>
                    <td style={{ fontWeight: 600 }}>{shortName(b.name)}</td>
                    <td className="num">{b.overs}</td>
                    <td className="num">{b.maidens}</td>
                    <td className="num">{b.runs}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{b.wickets}</td>
                    <td className="num">{b.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {inn.fow.length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              <b style={{ color: "var(--text)" }}>Fall of wickets:</b>{" "}
              {inn.fow
                .map((f) => `${f.wicketNumber}–${f.scoreText.split("/")[0]} (${shortName(f.playerOut)}, ${f.overBall})`)
                .join(" · ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FowTab({ data }: { data: MatchDetailDTO }) {
  const withFow = data.innings.filter((i) => i.fow.length > 0);
  if (withFow.length === 0) return <EmptyTab text="No wickets have fallen yet." />;
  return (
    <div style={{ padding: "clamp(14px, 2.5vw, 24px)", display: "flex", flexDirection: "column", gap: 22 }}>
      {withFow.map((inn) => (
        <div key={inn.inningsNumber} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <InningsHeading inn={inn} suffix={inningsLabel(inn.inningsNumber)} />
          <div style={{ overflowX: "auto" }}>
            <table className="stat">
              <thead>
                <tr>
                  <th>Wkt</th>
                  <th>Score</th>
                  <th>Over</th>
                  <th>Player out</th>
                  <th>Type</th>
                  <th>Bowler</th>
                  <th>Fielder</th>
                </tr>
              </thead>
              <tbody>
                {inn.fow.map((f) => (
                  <tr key={f.wicketNumber}>
                    <td className="t-num" style={{ fontWeight: 700 }}>{f.wicketNumber}</td>
                    <td className="t-num">{f.scoreText}</td>
                    <td className="t-num">{f.overBall}</td>
                    <td style={{ fontWeight: 600 }}>{shortName(f.playerOut)}</td>
                    <td>{f.typeLabel}</td>
                    <td>{f.bowler ?? "—"}</td>
                    <td>{f.fielder ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function BallByBallTab({ data }: { data: MatchDetailDTO }) {
  const withBalls = [...data.innings].reverse().filter((i) => i.overs.length > 0);
  if (withBalls.length === 0) return <EmptyTab text="Ball-by-ball commentary starts with the first delivery." />;
  return (
    <div style={{ padding: "clamp(14px, 2.5vw, 24px)", display: "flex", flexDirection: "column", gap: 22 }}>
      {withBalls.map((inn) => (
        <div key={inn.inningsNumber} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InningsHeading inn={inn} suffix={inningsLabel(inn.inningsNumber)} />
          {inn.overs.map((over) => (
            <div key={over.over} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="t-h3" style={{ fontSize: 16 }}>Over {over.over}</span>
                <span className="t-num" style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                  {over.runs} run{over.runs === 1 ? "" : "s"}
                </span>
              </div>
              {over.balls.map((b, i) => (
                <div key={`${b.overBall}-${i}`} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <span className="t-num" style={{ fontSize: 11.5, color: "var(--muted)", width: 34, flex: "none", paddingTop: 4 }}>
                    {b.overBall}
                  </span>
                  <Ball v={b.label} sm ariaLabel={`over ${b.overBall}`} />
                  <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{b.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function InfoTab({ data }: { data: MatchDetailDTO }) {
  return (
    <div style={{ padding: "clamp(14px, 2.5vw, 24px)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="grid grid-cols-2" style={{ gap: 10 }}>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Venue" value={data.venue?.name ?? "—"} sub={data.venue?.location} />
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Date & time" value={fmtDateTime(data.scheduledAt)} />
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Format" value={data.format} sub={data.stage ?? undefined} />
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat
            label="Umpires"
            value={data.umpires.length > 0 ? data.umpires.join(" · ") : "—"}
          />
        </div>
      </div>
      {data.playingXI.some((x) => x.players.length > 0) && (
        <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
          {data.playingXI.map((x) => (
            <div key={x.team.id} className="card" style={{ padding: 14, boxShadow: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="row" style={{ gap: 8 }}>
                <TeamLogo team={x.team} size="sm" />
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{x.team.name} — Playing XI</span>
              </span>
              <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                {x.players.map((p) => (
                  <li key={p.playerId} style={{ fontSize: 12.5 }}>
                    {shortName(p.name)}
                    {p.isKeeper && <span style={{ color: "var(--muted)" }}> (wk)</span>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {data.notes && (
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <Stat label="Notes" value={data.notes} />
        </div>
      )}
    </div>
  );
}

function EmptyTab({ text }: { text: string }) {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        <Icon d={IC.clock} size={20} />
      </span>
      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>{text}</span>
    </div>
  );
}
