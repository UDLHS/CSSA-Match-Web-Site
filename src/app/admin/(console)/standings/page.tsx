import { notFound } from "next/navigation";
import { activeSeasonId, listAdminTeams } from "@/server/queries/admin-entities";
import { listAdminStandings } from "@/server/queries/standings";
import { StandingsScreen } from "@/components/admin/standings/standings-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Standings — Fiesta Admin" };

export default async function AdminStandingsPage() {
  const seasonId = await activeSeasonId();
  if (!seasonId) notFound();

  const [rows, teams] = await Promise.all([
    listAdminStandings(seasonId),
    listAdminTeams(),
  ]);

  return (
    <StandingsScreen
      seasonId={seasonId}
      rows={rows.map((r) => ({
        id: r.id,
        teamId: r.teamId,
        teamName: r.team.name,
        shortName: r.team.shortName,
        logoUrl: r.team.logoUrl,
        primaryColor: r.team.primaryColor,
        groupName: r.groupName,
        played: r.played,
        won: r.won,
        lost: r.lost,
        noResult: r.noResult,
        points: r.points,
        netRunRate: r.netRunRate,
        status: r.status,
      }))}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
