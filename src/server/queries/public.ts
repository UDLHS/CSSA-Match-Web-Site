import type { LeaderboardKind, MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { LiveSnapshotPayload } from "@/server/scoring/snapshot";

/**
 * Public read layer — no session, read-only, only published data.
 * The hero / match cards read the denormalized ScoreSnapshot (one row,
 * no joins); heavier scorecard/leaderboard reads hit the relational data.
 */

/** Matches the public may see: published, not deleted. */
const publicMatchWhere = {
  deletedAt: null,
  status: { not: "DRAFT" as MatchStatus },
} satisfies Prisma.MatchWhereInput;

export interface SnapshotRead {
  matchId: string;
  version: number;
  status: MatchStatus;
  payload: LiveSnapshotPayload;
  updatedAt: string;
}

function toSnapshotRead(row: {
  matchId: string;
  version: number;
  status: MatchStatus;
  payload: Prisma.JsonValue;
  updatedAt: Date;
}): SnapshotRead {
  return {
    matchId: row.matchId,
    version: row.version,
    status: row.status,
    payload: row.payload as unknown as LiveSnapshotPayload,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Live snapshot for one match (polling/SSE read). */
export async function getMatchSnapshot(
  matchId: string,
): Promise<SnapshotRead | null> {
  const row = await prisma.scoreSnapshot.findFirst({
    where: { matchId, match: publicMatchWhere },
  });
  return row ? toSnapshotRead(row) : null;
}

/**
 * Hero pick: a LIVE / INNINGS_BREAK match first, else the next UPCOMING,
 * else the most recently completed.
 */
export async function getFeaturedMatchSnapshot(): Promise<SnapshotRead | null> {
  const live = await prisma.scoreSnapshot.findFirst({
    where: { status: { in: ["LIVE", "INNINGS_BREAK"] }, match: publicMatchWhere },
    orderBy: { updatedAt: "desc" },
  });
  if (live) return toSnapshotRead(live);

  const upcoming = await prisma.match.findFirst({
    where: { ...publicMatchWhere, status: "UPCOMING" },
    orderBy: { scheduledAt: "asc" },
    include: { snapshot: true },
  });
  if (upcoming?.snapshot) return toSnapshotRead(upcoming.snapshot);

  const completed = await prisma.match.findFirst({
    where: { ...publicMatchWhere, status: { in: ["COMPLETED", "ABANDONED"] } },
    orderBy: { scheduledAt: "desc" },
    include: { snapshot: true },
  });
  return completed?.snapshot ? toSnapshotRead(completed.snapshot) : null;
}

export type MatchCardTab = "live" | "upcoming" | "previous";

/** Card list per tab — straight from snapshots (already denormalized). */
export async function listMatchCards(
  tab: MatchCardTab,
): Promise<SnapshotRead[]> {
  const statuses: MatchStatus[] =
    tab === "live"
      ? ["LIVE", "INNINGS_BREAK"]
      : tab === "upcoming"
        ? ["UPCOMING"]
        : ["COMPLETED", "ABANDONED"];
  const rows = await prisma.scoreSnapshot.findMany({
    where: { status: { in: statuses }, match: publicMatchWhere },
    orderBy: { match: { scheduledAt: tab === "previous" ? "desc" : "asc" } },
    take: 30,
  });
  return rows.map(toSnapshotRead);
}

/** Full scorecard: innings, batting/bowling tables, FoW, extras, meta. */
export async function getMatchDetail(matchId: string) {
  const match = await prisma.match.findFirst({
    where: { id: matchId, ...publicMatchWhere },
    include: {
      venue: true,
      matchTeams: { include: { team: true } },
      playerOfMatch: { select: { id: true, fullName: true, photoUrl: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
      tossWonBy: { select: { id: true, name: true, shortName: true } },
      snapshot: true,
      battingStats: {
        include: { player: { select: { id: true, fullName: true, photoUrl: true } } },
        orderBy: { battingOrder: "asc" },
      },
      bowlingStats: {
        include: { player: { select: { id: true, fullName: true, photoUrl: true } } },
        orderBy: { wickets: "desc" },
      },
      innings: {
        orderBy: { inningsNumber: "asc" },
        include: {
          deliveries: {
            where: { wicket: { isNot: null } },
            orderBy: { sequence: "asc" },
            include: {
              wicket: {
                include: {
                  dismissedPlayer: { select: { id: true, fullName: true } },
                  fielder: { select: { id: true, fullName: true } },
                },
              },
              bowler: { select: { id: true, fullName: true } },
            },
          },
        },
      },
    },
  });
  return match;
}

/** Latest frozen leaderboard payload for a tab. */
export async function getLeaderboard(
  seasonId: string,
  kind: LeaderboardKind,
): Promise<{ payload: unknown; builtAt: string } | null> {
  const snap = await prisma.leaderboardSnapshot.findFirst({
    where: { seasonId, kind },
    orderBy: { builtAt: "desc" },
  });
  return snap
    ? { payload: snap.payload, builtAt: snap.builtAt.toISOString() }
    : null;
}

/** The active season (drives every public page). */
export async function getActiveSeason() {
  return prisma.season.findFirst({
    where: { isActive: true },
    include: { tournament: true, settings: true },
  });
}

/** Players grid: every active player + their active-season stat line. */
export async function listPlayersWithStats(seasonId?: string) {
  return prisma.player.findMany({
    where: { deletedAt: null },
    include: {
      team: {
        select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true },
      },
      careerStats: seasonId ? { where: { seasonId } } : true,
    },
    orderBy: [{ fullName: "asc" }],
  });
}

export async function listPlayers(teamId?: string) {
  return prisma.player.findMany({
    where: { deletedAt: null, ...(teamId ? { teamId } : {}) },
    include: {
      team: {
        select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true },
      },
    },
    orderBy: [{ teamId: "asc" }, { squadOrder: "asc" }, { fullName: "asc" }],
  });
}

export async function getPlayerProfile(playerId: string, seasonId?: string) {
  const player = await prisma.player.findFirst({
    where: { id: playerId, deletedAt: null },
    include: {
      team: {
        select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true },
      },
      careerStats: seasonId ? { where: { seasonId } } : true,
      popularVote: { select: { votes: true } },
      playerOfMatches: {
        where: publicMatchWhere,
        select: { id: true },
      },
      matchBattingStats: {
        where: { match: { ...publicMatchWhere, status: "COMPLETED" } },
        include: {
          match: {
            select: {
              id: true,
              matchNumber: true,
              scheduledAt: true,
              resultText: true,
              matchTeams: { include: { team: { select: { id: true, shortName: true } } } },
            },
          },
        },
        orderBy: { match: { scheduledAt: "desc" } },
        take: 10,
      },
      matchBowlingStats: {
        where: { match: { ...publicMatchWhere, status: "COMPLETED" } },
        include: {
          match: { select: { id: true, matchNumber: true, scheduledAt: true } },
        },
        orderBy: { match: { scheduledAt: "desc" } },
        take: 10,
      },
    },
  });
  return player;
}

/** Popular players — admin-set votes, ranked, top 3 highlighted in UI. */
export async function getPopularPlayers(limit = 10) {
  return prisma.popularVote.findMany({
    where: { player: { deletedAt: null } },
    include: {
      player: {
        include: {
          team: {
            select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true },
          },
        },
      },
    },
    orderBy: { votes: "desc" },
    take: limit,
  });
}

export async function listTeams() {
  return prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      captain: { select: { id: true, fullName: true } },
      homeVenue: { select: { id: true, name: true } },
      _count: { select: { players: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Squads grouped by team for the public Players page — captain first, then
 * the batting-lineup order, with each player's active-season key stat.
 */
export async function listSquads(seasonId?: string) {
  return prisma.team.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      shortName: true,
      logoUrl: true,
      primaryColor: true,
      coach: true,
      homeVenue: { select: { name: true } },
      players: {
        where: { deletedAt: null },
        orderBy: [
          { isCaptain: "desc" },
          { squadOrder: "asc" },
          { fullName: "asc" },
        ],
        select: {
          id: true,
          fullName: true,
          photoUrl: true,
          role: true,
          battingStyle: true,
          bowlingStyle: true,
          isCaptain: true,
          careerStats: seasonId
            ? { where: { seasonId }, select: { runs: true, wickets: true } }
            : { select: { runs: true, wickets: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}
