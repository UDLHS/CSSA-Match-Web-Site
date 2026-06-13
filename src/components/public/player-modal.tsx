"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProfileDTO } from "@/lib/player-types";
import { RoleAvatar, TeamLogo } from "./atoms";
import { Icon, IC, type ActivityRole } from "./icons";

const TABS = ["Overview", "Batting", "Bowling", "Recent Matches"] as const;
type Tab = (typeof TABS)[number];

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

interface HeaderFields {
  name: string;
  photoUrl: string | null;
  role: string;
  roleLabel: string;
  team: { id: string; name: string; shortName: string; logoUrl: string | null; primaryColor: string } | null;
  isCaptain?: boolean;
  battingStyleLabel?: string;
  bowlingStyleLabel?: string | null;
  votes?: number | null;
}

/** Lightweight info the opener already has — lets the modal paint instantly. */
export type PlayerModalInitial = HeaderFields;

/**
 * Player detail modal (boards/leaderboard.jsx → PlayerModalDesktop):
 * ink header + Overview / Batting / Bowling / Recent Matches tabs.
 *
 * If `initial` is supplied the header paints immediately (zero wait); the full
 * stats stream in from /api/players/:id. Without it, a skeleton shows first.
 */
export function PlayerModal({
  playerId,
  initial,
  onClose,
}: {
  playerId: string;
  initial?: PlayerModalInitial;
  onClose: () => void;
}) {
  const [data, setData] = useState<PlayerProfileDTO | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = async (id: string) => {
    setError(false);
    try {
      const res = await fetch(`/api/players/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    setData(null);
    setTab("Overview");
    void load(playerId);
  }, [playerId]);

  // Escape to close + scroll lock + initial focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "clamp(0px, 4vh, 40px) 0" }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={data ? data.name : "Player details"}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="card max-md:!rounded-none max-md:min-h-dvh"
        style={{ width: 680, maxWidth: "100%", borderRadius: 16, overflow: "hidden", padding: 0, boxShadow: "var(--shadow-pop)", outline: "none" }}
      >
        {error && !data ? (
          <ErrorCard onRetry={() => void load(playerId)} onClose={onClose} />
        ) : !data && !initial ? (
          <LoadingSkeleton onClose={onClose} />
        ) : (
          <>
            <Header fields={data ?? initial!} onClose={onClose} />
            <div className="tabs tabs-underline" role="tablist" aria-label="Player details" style={{ padding: "0 clamp(16px, 3vw, 26px)", overflowX: "auto" }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === tab}
                  className="tab"
                  {...(t === tab ? { "data-active": "" } : {})}
                  style={{ flex: "none" }}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {!data ? (
              <StatsLoading />
            ) : (
              <>
                {tab === "Overview" && <OverviewTab data={data} />}
                {tab === "Batting" && <BattingTab data={data} />}
                {tab === "Bowling" && <BowlingTab data={data} />}
                {tab === "Recent Matches" && <RecentTab data={data} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Header({ fields, onClose }: { fields: HeaderFields; onClose: () => void }) {
  const styleParts = [fields.battingStyleLabel, fields.bowlingStyleLabel].filter(Boolean) as string[];
  return (
    <div style={{ background: "var(--hero-grad)", color: "var(--on-ink)", padding: "22px clamp(16px, 3vw, 26px)", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <RoleAvatar name={fields.name} size={84} color="#fff" role={roleGlyph(fields.role)} photoUrl={fields.photoUrl} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 200 }}>
        <span className="t-display" style={{ fontSize: 30, color: "var(--on-ink)" }}>{fields.name}</span>
        <span className="row" style={{ gap: 8, fontSize: 13, color: "var(--on-ink-muted)", flexWrap: "wrap" }}>
          {fields.team && (
            <>
              <TeamLogo team={fields.team} size="sm" /> {fields.team.name}
            </>
          )}
          {styleParts.map((s) => (
            <span key={s} className="row" style={{ gap: 8 }}>
              <span className="dot-sep" /> {s}
            </span>
          ))}
        </span>
        <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <span className="badge" style={{ background: "var(--highlight)", color: "var(--ink)" }}>
            {fields.roleLabel}
          </span>
          {fields.isCaptain && (
            <span className="badge" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>Captain</span>
          )}
          {fields.votes != null && (
            <span className="badge" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>★ {fields.votes} votes</span>
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{ alignSelf: "flex-start", width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.12)", border: "none", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Icon d={IC.x} size={14} />
      </button>
    </div>
  );
}

/** Compact stat skeleton shown under the instant header while stats load. */
function StatsLoading() {
  return (
    <div style={{ padding: "clamp(16px, 3vw, 26px)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <span key={i} className="skl" style={{ height: 86, borderRadius: 12 }} />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card" style={{ padding: "14px 16px", boxShadow: "none" }}>
      <span className="t-label">{label}</span>
      <div className="t-num" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function OverviewTab({ data }: { data: PlayerProfileDTO }) {
  const s = data.stats;
  return (
    <div style={{ padding: "clamp(16px, 3vw, 26px)", display: "flex", flexDirection: "column", gap: 14 }}>
      {!s ? (
        <NoStats />
      ) : (
        <div className="grid max-md:grid-cols-2 md:grid-cols-3" style={{ gap: 12 }}>
          <StatCard label="Runs" value={s.runs} sub={`${s.matches} match${s.matches === 1 ? "" : "es"}`} />
          <StatCard label="Strike rate" value={s.strikeRate} sub={`${s.ballsFaced} balls faced`} />
          <StatCard label="Average" value={s.average} sub={`HS ${s.highest}`} />
          <StatCard label="Wickets" value={s.wickets} sub={s.wickets > 0 ? `econ ${s.economy}` : "—"} />
          <StatCard label="High score" value={s.highest} sub={`${s.fours}×4 · ${s.sixes}×6`} />
          <StatCard
            label={data.votes != null ? "Votes" : "Points"}
            value={data.votes ?? s.totalPoints}
            sub={data.playerOfMatchCount > 0 ? `${data.playerOfMatchCount}× Player of the Match` : undefined}
          />
        </div>
      )}
      {data.bio && (
        <div className="card" style={{ padding: 14, boxShadow: "none" }}>
          <span className="t-label">About</span>
          <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5 }}>{data.bio}</p>
        </div>
      )}
    </div>
  );
}

function BattingTab({ data }: { data: PlayerProfileDTO }) {
  const s = data.stats;
  if (!s) return <NoStats pad />;
  const rows: [string, string | number][] = [
    ["Matches", s.matches],
    ["Runs", s.runs],
    ["Balls faced", s.ballsFaced],
    ["Strike rate", s.strikeRate],
    ["Average", s.average],
    ["Fours", s.fours],
    ["Sixes", s.sixes],
    ["Highest score", s.highest],
    ["Fifties", s.fifties],
    ["Hundreds", s.hundreds],
  ];
  return <StatList rows={rows} />;
}

function BowlingTab({ data }: { data: PlayerProfileDTO }) {
  const s = data.stats;
  if (!s) return <NoStats pad />;
  if (s.legalBallsBowled === 0) {
    return <NoStats pad text="Hasn't bowled this season." />;
  }
  const rows: [string, string | number][] = [
    ["Overs", s.oversBowled],
    ["Maidens", s.maidens],
    ["Runs conceded", s.runsConceded],
    ["Wickets", s.wickets],
    ["Economy", s.economy],
    ["Average", s.bowlingAverage],
    ["Strike rate", s.bowlingStrikeRate],
    ["Best bowling", s.best ?? "—"],
    ["Catches", s.catches],
    ["Run outs", s.runOuts],
  ];
  return <StatList rows={rows} />;
}

function StatList({ rows }: { rows: [string, string | number][] }) {
  return (
    <div style={{ padding: "clamp(16px, 3vw, 26px)" }}>
      <table className="stat">
        <tbody>
          {rows.map(([l, v]) => (
            <tr key={l}>
              <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{l}</td>
              <td className="num" style={{ fontWeight: 700 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentTab({ data }: { data: PlayerProfileDTO }) {
  if (data.recentMatches.length === 0) {
    return <NoStats pad text="No completed matches yet." />;
  }
  return (
    <div style={{ padding: "clamp(16px, 3vw, 26px)", display: "flex", flexDirection: "column", gap: 10 }}>
      {data.recentMatches.map((m) => (
        <div key={m.matchId} className="card" style={{ padding: "12px 14px", boxShadow: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</span>
            <span className="row" style={{ gap: 10, fontSize: 12.5 }}>
              {m.batting && (
                <span className="t-num"><b>{m.batting}</b> <span style={{ color: "var(--muted)" }}>bat</span></span>
              )}
              {m.bowling && (
                <span className="t-num"><b>{m.bowling}</b> <span style={{ color: "var(--muted)" }}>bowl</span></span>
              )}
            </span>
          </div>
          {m.resultText && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.resultText}</span>}
        </div>
      ))}
    </div>
  );
}

function NoStats({ pad, text }: { pad?: boolean; text?: string }) {
  return (
    <div style={{ padding: pad ? 28 : 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        <Icon d={IC.user} size={20} />
      </span>
      <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
        {text ?? "Stats appear after the player's first completed match."}
      </span>
    </div>
  );
}

function LoadingSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <div style={{ background: "var(--hero-grad)", padding: 22, display: "flex", gap: 18, alignItems: "center" }}>
        <span className="skl" style={{ width: 84, height: 84, borderRadius: "50%" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <span className="skl" style={{ width: 180, height: 24 }} />
          <span className="skl" style={{ width: 130, height: 13 }} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ alignSelf: "flex-start", width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.12)", border: "none", color: "#fff", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>
      <div style={{ padding: 26, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className="skl" style={{ height: 86, borderRadius: 12 }} />
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
      <span style={{ width: 44, height: 44, borderRadius: "50%", background: "color-mix(in oklab, var(--danger) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}>
        <Icon d={IC.alert} size={20} />
      </span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>Couldn&#39;t load the player</span>
      <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Check your connection and try again.</span>
      <span className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <Icon d={IC.refresh} size={13} /> Retry
        </button>
        <button type="button" className="btn btn-soft btn-sm" onClick={onClose}>Close</button>
      </span>
    </div>
  );
}
