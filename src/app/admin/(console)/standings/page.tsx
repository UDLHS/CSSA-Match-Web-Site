import { notFound } from "next/navigation";
import { activeSeasonId } from "@/server/queries/admin-entities";
import { listAdminStandings } from "@/server/queries/standings";
import { StandingsScreen } from "@/components/admin/standings/standings-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Standings — Fiesta Admin" };

export default async function AdminStandingsPage() {
  const seasonId = await activeSeasonId();
  if (!seasonId) notFound();

  const rows = await listAdminStandings(seasonId);

  return (
    <StandingsScreen
      seasonId={seasonId}
      rows={rows.map((r) => ({
        teamId: r.teamId,
        teamName: r.team.name,
        shortName: r.team.shortName,
        primaryColor: r.team.primaryColor,
        groupName: r.groupName,
        played: r.played,
        won: r.won,
        lost: r.lost,
        noResult: r.noResult,
        points: r.points,
        netRunRate: r.netRunRate,
        pointsIsOverridden: r.pointsIsOverridden,
        nrrIsOverridden: r.nrrIsOverridden,
        autoPoints: r.autoPoints,
        autoNetRunRate: r.autoNetRunRate,
        status: r.status,
      }))}
    />
  );
}
