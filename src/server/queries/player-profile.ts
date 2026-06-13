import { prisma } from "@/lib/db";
import {
  bowlingAverage,
  bowlingStrikeRate,
  battingAverage,
  economyRate,
  formatBowlingFigures,
  formatHighScore,
  oversDisplay,
  strikeRate,
} from "@/lib/scoring";
import { fmtDateShort, fmtRate } from "@/lib/format";
import {
  BATTING_STYLE_LABELS,
  BOWLING_STYLE_LABELS,
  ROLE_LABELS,
  type PlayerProfileDTO,
  type PlayerRecentMatch,
} from "@/lib/player-types";

/** Public player profile payload — feeds the player modal. */
export async function getPlayerProfileDTO(
  playerId: string,
): Promise<PlayerProfileDTO | null> {
  const season = await prisma.season.findFirst({ where: { isActive: true } });

  const player = await prisma.player.findFirst({
    where: { id: playerId, deletedAt: null },
    include: {
      team: {
        select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true },
      },
      popularVote: { select: { votes: true } },
      playerOfMatches: {
        where: { deletedAt: null, status: "COMPLETED" },
        select: { id: true },
      },
      careerStats: season ? { where: { seasonId: season.id } } : true,
      matchBattingStats: {
        where: { match: { deletedAt: null, status: "COMPLETED" } },
        include: {
          match: {
            select: {
              id: true,
              scheduledAt: true,
              resultText: true,
              matchTeams: {
                include: { team: { select: { id: true, shortName: true } } },
              },
            },
          },
        },
        orderBy: { match: { scheduledAt: "desc" } },
        take: 10,
      },
      matchBowlingStats: {
        where: { match: { deletedAt: null, status: "COMPLETED" } },
        include: {
          match: {
            select: {
              id: true,
              scheduledAt: true,
              resultText: true,
              matchTeams: {
                include: { team: { select: { id: true, shortName: true } } },
              },
            },
          },
        },
        orderBy: { match: { scheduledAt: "desc" } },
        take: 10,
      },
    },
  });
  if (!player) return null;

  const cs = player.careerStats[0] ?? null;

  // Merge batting + bowling rows into one recent-matches list.
  const recent = new Map<string, PlayerRecentMatch>();
  const labelFor = (match: {
    scheduledAt: Date;
    matchTeams: { team: { id: string; shortName: string } }[];
  }) => {
    const opponent = match.matchTeams.find((mt) => mt.team.id !== player.teamId);
    return `vs ${opponent?.team.shortName ?? "?"} · ${fmtDateShort(match.scheduledAt.toISOString())}`;
  };
  for (const b of player.matchBattingStats) {
    recent.set(b.matchId, {
      matchId: b.matchId,
      label: labelFor(b.match),
      batting: `${b.runs}${b.notOut ? "*" : ""} (${b.balls})`,
      bowling: null,
      resultText: b.match.resultText,
    });
  }
  for (const b of player.matchBowlingStats) {
    const existing = recent.get(b.matchId);
    const line = `${b.wickets}/${b.runsConceded} (${oversDisplay(b.legalBalls)})`;
    if (existing) existing.bowling = line;
    else {
      recent.set(b.matchId, {
        matchId: b.matchId,
        label: labelFor(b.match),
        batting: null,
        bowling: line,
        resultText: b.match.resultText,
      });
    }
  }

  return {
    playerId: player.id,
    name: player.fullName,
    photoUrl: player.photoUrl,
    role: player.role,
    roleLabel: ROLE_LABELS[player.role] ?? player.role,
    battingStyleLabel: BATTING_STYLE_LABELS[player.battingStyle] ?? player.battingStyle,
    bowlingStyleLabel: BOWLING_STYLE_LABELS[player.bowlingStyle] || null,
    jerseyNumber: player.jerseyNumber,
    isCaptain: player.isCaptain,
    bio: player.bio,
    team: player.team,
    votes: player.popularVote?.votes ?? null,
    playerOfMatchCount: player.playerOfMatches.length,
    stats: cs
      ? {
          matches: cs.matches,
          runs: cs.runs,
          ballsFaced: cs.ballsFaced,
          strikeRate: fmtRate(strikeRate(cs.runs, cs.ballsFaced), 1),
          average: fmtRate(battingAverage(cs.runs, cs.dismissals), 1),
          fours: cs.fours,
          sixes: cs.sixes,
          highest: formatHighScore({ runs: cs.highestScore, notOut: cs.highestScoreNotOut }),
          fifties: cs.fifties,
          hundreds: cs.hundreds,
          legalBallsBowled: cs.legalBallsBowled,
          oversBowled: oversDisplay(cs.legalBallsBowled),
          maidens: cs.maidens,
          runsConceded: cs.runsConceded,
          wickets: cs.wickets,
          economy: fmtRate(economyRate(cs.runsConceded, cs.legalBallsBowled)),
          bowlingAverage: fmtRate(bowlingAverage(cs.runsConceded, cs.wickets), 1),
          bowlingStrikeRate: fmtRate(bowlingStrikeRate(cs.legalBallsBowled, cs.wickets), 1),
          best:
            cs.bestBowlingWickets > 0
              ? formatBowlingFigures({
                  wickets: cs.bestBowlingWickets,
                  runsConceded: cs.bestBowlingRuns,
                })
              : null,
          catches: cs.catches,
          stumpings: cs.stumpings,
          runOuts: cs.runOuts,
          totalPoints: cs.totalPoints,
        }
      : null,
    recentMatches: [...recent.values()],
  };
}
