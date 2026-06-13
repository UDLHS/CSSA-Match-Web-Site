"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rebuildLeaderboards } from "@/server/actions/leaderboard";
import { PageHead, Panel } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

const RECOMPUTED = [
  ["Batting table", "Runs, balls, SR, average, 4s/6s, HS"],
  ["Bowling table", "Overs, runs, wickets, economy, best figures"],
  ["Overall points", "Bat + bowl + field points"],
  ["Team standings", "Played, won, lost, points, net run rate"],
  ["Popularity rank", "Sorted from current vote counts"],
];

export function RebuildScreen({
  seasonId,
  lastRebuiltAt,
  ballsProcessed,
}: {
  seasonId: string;
  lastRebuiltAt: string | null;
  ballsProcessed: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ players: number; balls: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rebuild = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await rebuildLeaderboards(seasonId);
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setResult({ players: res.data.players, balls: res.data.ballsProcessed });
    router.refresh();
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "never";

  return (
    <>
      <PageHead title="Leaderboard & stats" sub="Recompute every batting, bowling and points table from scored deliveries" />
      <div className="grid max-md:grid-cols-1 md:grid-cols-[5fr_7fr]" style={{ gap: 16, alignItems: "start" }}>
        <Panel title="Rebuild engine">
          <div className="row" style={{ gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", background: "color-mix(in oklab, var(--success) 14%, transparent)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon d={IC.check2} size={22} />
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{lastRebuiltAt ? "Up to date" : "Not built yet"}</span>
              <span className="t-small" style={{ color: "var(--muted)" }}>
                Last rebuilt {fmt(lastRebuiltAt)}{ballsProcessed ? ` · ${ballsProcessed} balls processed` : ""}
              </span>
            </span>
          </div>
          <button type="button" className="btn btn-primary btn-lg" style={{ justifyContent: "center" }} onClick={rebuild} disabled={busy}>
            <Icon d={IC.refresh} size={16} /> {busy ? "Rebuilding…" : "Rebuild now"}
          </button>
          {result && (
            <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--success)" }}>
              <Icon d={IC.check2} size={14} /> Rebuilt {result.players} players · {result.balls} balls processed.
            </div>
          )}
          {error && (
            <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}>
              <Icon d={IC.alert} size={14} /> {error}
            </div>
          )}
          <span className="t-small" style={{ color: "var(--muted)" }}>
            Runs automatically after every completed match. Manual rebuild is safe and non-destructive.
          </span>
        </Panel>

        <Panel title="What gets recomputed">
          {RECOMPUTED.map(([t, d]) => (
            <div key={t} className="row" style={{ gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--success)" }}><Icon d={IC.check2} size={16} /></span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{d}</span>
              </span>
              <span className="badge badge-completed" style={{ marginLeft: "auto" }}>In sync</span>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
