import type { Prisma } from "@prisma/client";
import {
  compareBestBowling,
  compareHighestScore,
  computeOverallPoints,
  DEFAULT_POINTS_CONFIG,
  economyRate,
  formatBowlingFigures,
  formatHighScore,
  oversDisplay,
  strikeRate,
  battingAverage,
  bowlingAverage,
  bowlingStrikeRate,
  type PointsConfig,
} from "@/lib/scoring";
import { ActionError } from "@/server/errors";
import type { Db } from "@/server/audit";

/**
 * Leaderboard engine — rebuilds PlayerCareerStats and the frozen
 * LeaderboardSnapshot payloads from COMPLETED matches of a season.
 * Runs on match completion and on the admin "rebuild" button; never live
 * per-ball (backend-spec §7).
 */

interface PlayerAgg {
  playerId: string;
  matches: Set<string>;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  dismissals: number;
  highestScore: number;
  highestScoreNotOut: boolean;
  fifties: number;
  hundreds: number;
  legalBallsBowled: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  catches: number;
  stumpings: number;
  directHitRunOuts: number;
  assistedRunOuts: number;
  playerOfMatchCount: number;
}

function emptyAgg(playerId: string): PlayerAgg {
  return {
    playerId,
    matches: new Set(),
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    dismissals: 0,
    highestScore: 0,
    highestScoreNotOut: false,
    fifties: 0,
    hundreds: 0,
    legalBallsBowled: 0,
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    bestBowlingWickets: 0,
    bestBowlingRuns: 0,
    catches: 0,
    stumpings: 0,
    directHitRunOuts: 0,
    assistedRunOuts: 0,
    playerOfMatchCount: 0,
  };
}

export async function rebuildSeasonStats(
  db: Db,
  seasonId: string,
  triggeredBy: string,
): Promise<{ players: number; ballsProcessed: number }> {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { settings: true },
  });
  if (!season) throw new ActionError("NOT_FOUND", "Season not found");

  const pointsConfig =
    (season.settings?.pointsConfig as PointsConfig | null) ??
    DEFAULT_POINTS_CONFIG;
  const ballsPerOver = season.settings?.defaultBallsPerOver ?? 6;

  const matches = await db.match.findMany({
    where: { seasonId, status: "COMPLETED", deletedAt: null },
    include: {
      battingStats: true,
      bowlingStats: true,
      innings: {
        include: {
          deliveries: {
            where: { wicket: { isNot: null } },
            include: { wicket: true },
          },
        },
      },
    },
  });

  const aggs = new Map<string, PlayerAgg>();
  const agg = (playerId: string) => {
    let a = aggs.get(playerId);
    if (!a) {
      a = emptyAgg(playerId);
      aggs.set(playerId, a);
    }
    return a;
  };

  let ballsProcessed = 0;

  for (const match of matches) {
    for (const bat of match.battingStats) {
      const a = agg(bat.playerId);
      a.matches.add(match.id);
      a.runs += bat.runs;
      a.ballsFaced += bat.balls;
      a.fours += bat.fours;
      a.sixes += bat.sixes;
      if (!bat.notOut) a.dismissals += 1;
      if (bat.runs >= 100) a.hundreds += 1;
      else if (bat.runs >= 50) a.fifties += 1;
      if (
        compareHighestScore(
          { runs: bat.runs, notOut: bat.notOut },
          { runs: a.highestScore, notOut: a.highestScoreNotOut },
        ) < 0
      ) {
        a.highestScore = bat.runs;
        a.highestScoreNotOut = bat.notOut;
      }
    }

    for (const bowl of match.bowlingStats) {
      const a = agg(bowl.playerId);
      a.matches.add(match.id);
      a.legalBallsBowled += bowl.legalBalls;
      a.maidens += bowl.maidens;
      a.runsConceded += bowl.runsConceded;
      a.wickets += bowl.wickets;
      ballsProcessed += bowl.legalBalls;
      if (
        bowl.wickets > 0 &&
        compareBestBowling(
          { wickets: bowl.wickets, runsConceded: bowl.runsConceded },
          { wickets: a.bestBowlingWickets, runsConceded: a.bestBowlingRuns },
        ) < 0
      ) {
        a.bestBowlingWickets = bowl.wickets;
        a.bestBowlingRuns = bowl.runsConceded;
      }
    }

    // Fielding credits from wicket rows.
    for (const innings of match.innings) {
      for (const d of innings.deliveries) {
        const w = d.wicket;
        if (!w) continue;
        switch (w.type) {
          case "CAUGHT":
            if (w.fielderId) agg(w.fielderId).catches += 1;
            break;
          case "CAUGHT_AND_BOWLED":
            if (d.bowlerId) agg(d.bowlerId).catches += 1;
            break;
          case "STUMPED":
            if (w.fielderId) agg(w.fielderId).stumpings += 1;
            break;
          case "RUN_OUT":
            if (w.directHit && w.fielderId) {
              agg(w.fielderId).directHitRunOuts += 1;
            } else {
              if (w.fielderId) agg(w.fielderId).assistedRunOuts += 1;
              if (w.assistFielderId) {
                agg(w.assistFielderId).assistedRunOuts += 1;
              }
            }
            break;
        }
      }
    }

    if (match.playerOfMatchId) {
      agg(match.playerOfMatchId).playerOfMatchCount += 1;
    }
  }

  // ---- write PlayerCareerStats (delete + recreate, deterministic) ---------
  await db.playerCareerStats.deleteMany({ where: { seasonId } });
  const now = new Date();
  const rows = [...aggs.values()].map((a) => {
    const points = computeOverallPoints(
      {
        runs: a.runs,
        fours: a.fours,
        sixes: a.sixes,
        fifties: a.fifties,
        hundreds: a.hundreds,
        wickets: a.wickets,
        runsConceded: a.runsConceded,
        legalBallsBowled: a.legalBallsBowled,
        maidens: a.maidens,
        catches: a.catches,
        stumpings: a.stumpings,
        directHitRunOuts: a.directHitRunOuts,
        assistedRunOuts: a.assistedRunOuts,
      },
      pointsConfig,
      ballsPerOver,
    );
    return {
      playerId: a.playerId,
      seasonId,
      matches: a.matches.size,
      runs: a.runs,
      ballsFaced: a.ballsFaced,
      fours: a.fours,
      sixes: a.sixes,
      dismissals: a.dismissals,
      highestScore: a.highestScore,
      highestScoreNotOut: a.highestScoreNotOut,
      fifties: a.fifties,
      hundreds: a.hundreds,
      legalBallsBowled: a.legalBallsBowled,
      maidens: a.maidens,
      runsConceded: a.runsConceded,
      wickets: a.wickets,
      bestBowlingWickets: a.bestBowlingWickets,
      bestBowlingRuns: a.bestBowlingRuns,
      catches: a.catches,
      stumpings: a.stumpings,
      runOuts: a.directHitRunOuts + a.assistedRunOuts,
      battingPoints: Math.round(points.battingPoints),
      bowlingPoints: Math.round(points.bowlingPoints),
      fieldingPoints: Math.round(points.fieldingPoints),
      totalPoints: Math.round(points.totalPoints),
      playerOfMatchCount: a.playerOfMatchCount,
      lastRebuiltAt: now,
    };
  });
  if (rows.length > 0) {
    await db.playerCareerStats.createMany({ data: rows });
  }

  await buildLeaderboardSnapshots(
    db,
    seasonId,
    ballsPerOver,
    ballsProcessed,
    triggeredBy,
  );

  return { players: rows.length, ballsProcessed };
}

/** Frozen, ranked payloads the public leaderboard reads directly. */
async function buildLeaderboardSnapshots(
  db: Db,
  seasonId: string,
  ballsPerOver: number,
  ballsProcessed: number,
  triggeredBy: string,
): Promise<void> {
  const stats = await db.playerCareerStats.findMany({
    where: { seasonId },
    include: {
      player: {
        include: {
          team: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true } },
        },
      },
    },
  });

  const playerHead = (s: (typeof stats)[number]) => ({
    playerId: s.playerId,
    name: s.player.fullName,
    photoUrl: s.player.photoUrl,
    role: s.player.role,
    team: s.player.team
      ? {
          id: s.player.team.id,
          name: s.player.team.name,
          shortName: s.player.team.shortName,
          logoUrl: s.player.team.logoUrl,
          primaryColor: s.player.team.primaryColor,
        }
      : null,
  });

  const batting = stats
    .filter((s) => s.ballsFaced > 0)
    .sort(
      (a, b) =>
        b.runs - a.runs ||
        (strikeRate(b.runs, b.ballsFaced) ?? 0) -
          (strikeRate(a.runs, a.ballsFaced) ?? 0),
    )
    .map((s, i) => ({
      rank: i + 1,
      ...playerHead(s),
      matches: s.matches,
      runs: s.runs,
      balls: s.ballsFaced,
      strikeRate: strikeRate(s.runs, s.ballsFaced),
      average: battingAverage(s.runs, s.dismissals),
      fours: s.fours,
      sixes: s.sixes,
      highest: formatHighScore({
        runs: s.highestScore,
        notOut: s.highestScoreNotOut,
      }),
    }));

  const bowling = stats
    .filter((s) => s.legalBallsBowled > 0)
    .sort(
      (a, b) =>
        b.wickets - a.wickets ||
        (economyRate(a.runsConceded, a.legalBallsBowled, ballsPerOver) ?? 99) -
          (economyRate(b.runsConceded, b.legalBallsBowled, ballsPerOver) ?? 99),
    )
    .map((s, i) => ({
      rank: i + 1,
      ...playerHead(s),
      matches: s.matches,
      overs: oversDisplay(s.legalBallsBowled, ballsPerOver),
      balls: s.legalBallsBowled,
      runsConceded: s.runsConceded,
      wickets: s.wickets,
      economy: economyRate(s.runsConceded, s.legalBallsBowled, ballsPerOver),
      average: bowlingAverage(s.runsConceded, s.wickets),
      strikeRate: bowlingStrikeRate(s.legalBallsBowled, s.wickets),
      best:
        s.bestBowlingWickets > 0
          ? formatBowlingFigures({
              wickets: s.bestBowlingWickets,
              runsConceded: s.bestBowlingRuns,
            })
          : null,
    }));

  const overall = [...stats]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((s, i) => ({
      rank: i + 1,
      ...playerHead(s),
      matches: s.matches,
      battingPoints: s.battingPoints,
      bowlingPoints: s.bowlingPoints,
      fieldingPoints: s.fieldingPoints,
      totalPoints: s.totalPoints,
      playerOfMatchCount: s.playerOfMatchCount,
    }));

  const standings = await buildTeamStandings(db, seasonId);
  await syncTeamStandings(db, seasonId, standings);

  const votes = await db.popularVote.findMany({
    include: {
      player: {
        include: {
          team: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true } },
        },
      },
    },
    orderBy: { votes: "desc" },
  });
  const popularity = votes.map((v, i) => ({
    rank: i + 1,
    playerId: v.playerId,
    name: v.player.fullName,
    photoUrl: v.player.photoUrl,
    team: v.player.team
      ? {
          id: v.player.team.id,
          name: v.player.team.name,
          shortName: v.player.team.shortName,
          logoUrl: v.player.team.logoUrl,
          primaryColor: v.player.team.primaryColor,
        }
      : null,
    votes: v.votes,
  }));

  const kinds = [
    ["BATTING", batting],
    ["BOWLING", bowling],
    ["OVERALL", overall],
    ["TEAM_STANDINGS", standings],
    ["POPULARITY", popularity],
  ] as const;

  for (const [kind, payload] of kinds) {
    await db.leaderboardSnapshot.create({
      data: {
        seasonId,
        kind,
        payload: payload as unknown as Prisma.InputJsonValue,
        ballsProcessed,
        triggeredBy,
      },
    });
  }
}

async function buildTeamStandings(db: Db, seasonId: string) {
  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { settings: true },
  });
  const pointsWin = season?.settings?.pointsWin ?? 2;
  const pointsTie = season?.settings?.pointsTie ?? 1;
  const pointsLoss = season?.settings?.pointsLoss ?? 0;

  const matches = await db.match.findMany({
    where: { seasonId, status: "COMPLETED", deletedAt: null },
    include: { matchTeams: { include: { team: true } }, innings: true },
  });

  interface Standing {
    teamId: string;
    name: string;
    shortName: string;
    logoUrl: string | null;
    primaryColor: string;
    played: number;
    won: number;
    lost: number;
    tied: number;
    points: number;
    runsFor: number;
    ballsFaced: number;
    runsAgainst: number;
    ballsBowled: number;
  }
  const table = new Map<string, Standing>();

  for (const match of matches) {
    for (const mt of match.matchTeams) {
      if (!table.has(mt.teamId)) {
        table.set(mt.teamId, {
          teamId: mt.teamId,
          name: mt.team.name,
          shortName: mt.team.shortName,
          logoUrl: mt.team.logoUrl,
          primaryColor: mt.team.primaryColor,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          points: 0,
          runsFor: 0,
          ballsFaced: 0,
          runsAgainst: 0,
          ballsBowled: 0,
        });
      }
      const row = table.get(mt.teamId)!;
      row.played += 1;
      if (match.winnerTeamId === mt.teamId) {
        row.won += 1;
        row.points += pointsWin;
      } else if (match.winnerTeamId) {
        row.lost += 1;
        row.points += pointsLoss;
      } else {
        row.tied += 1;
        row.points += pointsTie;
      }
    }
    // NRR inputs: all-out innings count as the full quota of balls.
    for (const inn of match.innings) {
      const batting = table.get(inn.battingTeamId);
      const bowling = table.get(inn.bowlingTeamId);
      const balls =
        inn.closeReason === "ALL_OUT"
          ? inn.oversLimit * inn.ballsPerOver
          : inn.legalBalls;
      if (batting) {
        batting.runsFor += inn.totalRuns;
        batting.ballsFaced += balls;
      }
      if (bowling) {
        bowling.runsAgainst += inn.totalRuns;
        bowling.ballsBowled += balls;
      }
    }
  }

  return [...table.values()]
    .map((t) => ({
      ...t,
      nrr:
        t.ballsFaced > 0 && t.ballsBowled > 0
          ? Number(
              (
                t.runsFor / (t.ballsFaced / 6) -
                t.runsAgainst / (t.ballsBowled / 6)
              ).toFixed(3),
            )
          : null,
    }))
    .sort((a, b) => b.points - a.points || (b.nrr ?? 0) - (a.nrr ?? 0))
    .map((t, i) => ({ rank: i + 1, ...t }));
}

/**
 * Persist the freshly computed points/NRR into TeamStanding.auto* so the
 * admin-editable points table (server/queries/standings.ts) stays correct
 * without anyone typing numbers in. Only the auto* columns are touched —
 * groupName/status/sortHint and any admin pointsOverride/nrrOverride are
 * left exactly as they are.
 */
async function syncTeamStandings(
  db: Db,
  seasonId: string,
  standings: Awaited<ReturnType<typeof buildTeamStandings>>,
): Promise<void> {
  for (const s of standings) {
    await db.teamStanding.upsert({
      where: { seasonId_teamId: { seasonId, teamId: s.teamId } },
      create: { seasonId, teamId: s.teamId, autoPoints: s.points, autoNetRunRate: s.nrr },
      update: { autoPoints: s.points, autoNetRunRate: s.nrr },
    });
  }
}
