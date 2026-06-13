import { SquadsView, type TeamSquad } from "@/components/public/squads-view";
import { BATTING_STYLE_LABELS, BOWLING_STYLE_LABELS, ROLE_LABELS } from "@/lib/player-types";
import { getActiveSeason, listSquads } from "@/server/queries/public";

export const dynamic = "force-dynamic";

export const metadata = { title: "Squads — Cricket Fiesta '26" };

export default async function PlayersPage() {
  const season = await getActiveSeason();
  const teams = await listSquads(season?.id);

  const squads: TeamSquad[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    logoUrl: t.logoUrl,
    primaryColor: t.primaryColor,
    coach: t.coach,
    homeVenue: t.homeVenue?.name ?? null,
    players: t.players.map((p) => {
      const cs = p.careerStats[0] ?? null;
      const keyStat =
        p.role === "BOWLER"
          ? { label: "WKTS", value: cs?.wickets ?? 0 }
          : { label: "RUNS", value: cs?.runs ?? 0 };
      const styleLine = [
        BATTING_STYLE_LABELS[p.battingStyle] ?? "",
        BOWLING_STYLE_LABELS[p.bowlingStyle] || "",
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        playerId: p.id,
        name: p.fullName,
        photoUrl: p.photoUrl,
        role: p.role,
        roleLabel: ROLE_LABELS[p.role] ?? p.role,
        styleLine,
        isCaptain: p.isCaptain,
        keyStat,
      };
    }),
  }));

  return (
    <div
      style={{
        padding: "clamp(14px, 2.5vw, 24px) clamp(14px, 3vw, 32px) 36px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <h1 className="t-display">Squads</h1>
        <span className="t-small" style={{ color: "var(--muted)" }}>
          Every team and its players — captain first. Tap a player for full stats.
        </span>
      </div>
      <SquadsView teams={squads} />
    </div>
  );
}
