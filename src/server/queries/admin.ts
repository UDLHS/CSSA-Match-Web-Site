import { prisma } from "@/lib/db";
import { oversDisplay } from "@/lib/scoring";

/** Admin dashboard summary — counts, the live match, today's fixtures, audit. */
export async function getDashboardData() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [
    matchCount,
    liveToday,
    teamCount,
    playerCount,
    ballsLogged,
    liveMatches,
    todaysFixtures,
    recentAudit,
  ] = await Promise.all([
    prisma.match.count({ where: { deletedAt: null, status: { not: "DRAFT" } } }),
    prisma.match.count({
      where: { deletedAt: null, status: { in: ["LIVE", "INNINGS_BREAK"] } },
    }),
    prisma.team.count({ where: { deletedAt: null } }),
    prisma.player.count({ where: { deletedAt: null } }),
    prisma.delivery.count({ where: { isNonBall: false } }),
    prisma.match.findMany({
      where: { deletedAt: null, status: { in: ["LIVE", "INNINGS_BREAK"] } },
      include: {
        matchTeams: { include: { team: true } },
        snapshot: true,
        innings: { orderBy: { inningsNumber: "asc" } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.match.findMany({
      where: {
        deletedAt: null,
        status: { not: "DRAFT" },
        scheduledAt: { gte: startOfDay, lt: endOfDay },
      },
      include: { matchTeams: { include: { team: true } }, venue: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const liveCards = liveMatches.map((m) => {
    const last = m.innings[m.innings.length - 1];
    const home = m.matchTeams.find((mt) => mt.isHome)?.team;
    const away = m.matchTeams.find((mt) => !mt.isHome)?.team;
    return {
      id: m.id,
      matchNumber: m.matchNumber,
      title: `${home?.name ?? "?"} vs ${away?.name ?? "?"}`,
      score: last ? `${last.totalRuns}/${last.wickets}` : "—",
      overs: last ? `${oversDisplay(last.legalBalls, last.ballsPerOver)} / ${last.oversLimit}` : "",
      target: last?.target ?? null,
      needLine:
        last?.target != null
          ? `need ${Math.max(last.target - last.totalRuns, 0)} off ${Math.max(last.oversLimit * last.ballsPerOver - last.legalBalls, 0)}`
          : null,
    };
  });

  return {
    stats: {
      matches: matchCount,
      liveToday,
      teams: teamCount,
      players: playerCount,
      ballsLogged,
    },
    liveCards,
    todaysFixtures: todaysFixtures.map((m) => {
      const home = m.matchTeams.find((mt) => mt.isHome)?.team;
      const away = m.matchTeams.find((mt) => !mt.isHome)?.team;
      return {
        id: m.id,
        matchNumber: m.matchNumber,
        teams: `${home?.shortName ?? "?"} vs ${away?.shortName ?? "?"}`,
        status: m.status,
        time: m.scheduledAt.toISOString(),
        venue: m.venue?.name ?? null,
      };
    }),
    recentAudit: recentAudit.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      details: a.details,
      who: a.user?.name ?? "System",
      at: a.createdAt.toISOString(),
    })),
  };
}
