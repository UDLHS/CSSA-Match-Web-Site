import { LeaderboardTable } from "@/components/public/leaderboard-table";
import type {
  LbBattingRow,
  LbBowlingRow,
  LbOverallRow,
  LbTeamRef,
} from "@/lib/leaderboard-types";
import {
  getActiveSeason,
  getLeaderboard,
  listTeams,
} from "@/server/queries/public";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard — Cricket Fiesta '26" };

export default async function LeaderboardPage() {
  const season = await getActiveSeason();
  const [batting, bowling, overall, teams] = await Promise.all([
    season ? getLeaderboard(season.id, "BATTING") : null,
    season ? getLeaderboard(season.id, "BOWLING") : null,
    season ? getLeaderboard(season.id, "OVERALL") : null,
    listTeams(),
  ]);

  const teamRefs: LbTeamRef[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    logoUrl: t.logoUrl,
    primaryColor: t.primaryColor,
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
      <h1 className="t-display">Leaderboard</h1>
      <LeaderboardTable
        batting={(batting?.payload as LbBattingRow[]) ?? []}
        bowling={(bowling?.payload as LbBowlingRow[]) ?? []}
        overall={(overall?.payload as LbOverallRow[]) ?? []}
        teams={teamRefs}
      />
    </div>
  );
}
