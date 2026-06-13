import { prisma } from "@/lib/db";
import { activeSeasonId } from "@/server/queries/admin-entities";
import { RebuildScreen } from "@/components/admin/leaderboard/rebuild-screen";
import { EmptyState } from "@/components/admin/kit";
import { IC } from "@/components/public/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard — Fiesta Admin" };

export default async function AdminLeaderboardPage() {
  const seasonId = await activeSeasonId();
  if (!seasonId) {
    return <EmptyState icon={IC.refresh} title="No active season" sub="Set an active season in Settings first." />;
  }

  const [latest, latestStat] = await Promise.all([
    prisma.leaderboardSnapshot.findFirst({
      where: { seasonId },
      orderBy: { builtAt: "desc" },
      select: { builtAt: true, ballsProcessed: true },
    }),
    prisma.playerCareerStats.findFirst({
      where: { seasonId },
      orderBy: { lastRebuiltAt: "desc" },
      select: { lastRebuiltAt: true },
    }),
  ]);

  return (
    <RebuildScreen
      seasonId={seasonId}
      lastRebuiltAt={(latest?.builtAt ?? latestStat?.lastRebuiltAt)?.toISOString() ?? null}
      ballsProcessed={latest?.ballsProcessed ?? 0}
    />
  );
}
