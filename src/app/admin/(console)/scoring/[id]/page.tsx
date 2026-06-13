import Link from "next/link";
import { notFound } from "next/navigation";
import { getScoringState } from "@/server/queries/scoring-state";
import { ScoringConsole } from "@/components/admin/scoring/scoring-console";
import { StartMatchButton } from "@/components/admin/scoring/start-match-button";

export const dynamic = "force-dynamic";

export default async function ScoringConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await getScoringState(id);
  if (!state) notFound();

  const title = [state.battingTeam?.name, state.bowlingTeam?.name].filter(Boolean).join(" vs ");

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <Link href="/admin/scoring" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
          ← All matches
        </Link>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Match {state.matchNumber} · {title}</span>
      </div>

      {state.matchStatus === "UPCOMING" ? (
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, maxWidth: 460 }}>
          <span className="t-h3">Ready to start</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            The toss and both playing XIs must be set (do that on the Matches screen).
            Starting the match makes it LIVE and opens scoring.
          </span>
          <StartMatchButton matchId={state.matchId} />
        </div>
      ) : (
        <ScoringConsole initial={state} />
      )}
    </>
  );
}
