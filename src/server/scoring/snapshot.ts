import type { MatchStatus, Prisma } from "@prisma/client";
import {
  getInningsSummary,
  oversDisplay,
  replayInnings,
  type InningsState,
} from "@/lib/scoring";
import { ActionError } from "@/server/errors";
import type { Db } from "@/server/audit";
import { decodeEvents, type DeliveryRow } from "./codec";
import { buildInningsConfig } from "./persist";

/**
 * THE live read model (live_snapshot). One denormalized JSON row per match —
 * the public site reads ONLY this for the hero/cards, via polling or SSE.
 * Rebuilt inside every mutation's transaction; optimistic `version` check
 * means concurrent writers can never silently clobber each other.
 */

export interface SnapshotTeam {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export interface SnapshotBatterLine {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface SnapshotBowlerLine {
  playerId: string;
  name: string;
  legalBalls: number;
  oversDisplay: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
}

export interface SnapshotInnings {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  closeReason: string | null;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversDisplay: string;
  oversLimit: number;
  ballsPerOver: number;
  target: number | null;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalties: number;
    total: number;
  };
}

export interface SnapshotLive {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  oversDisplay: string;
  currentRunRate: number | null;
  target: number | null;
  runsNeeded: number | null;
  ballsRemaining: number | null;
  requiredRunRate: number | null;
  striker: SnapshotBatterLine | null;
  nonStriker: SnapshotBatterLine | null;
  bowler: SnapshotBowlerLine | null;
  lastBalls: { overBall: string; label: string }[];
  freeHitPending: boolean;
}

export interface LiveSnapshotPayload {
  matchId: string;
  matchNumber: number;
  stage: string | null;
  format: string;
  oversPerSide: number;
  ballsPerOver: number;
  playersPerSide: number;
  status: MatchStatus;
  scheduledAt: string; // ISO
  venue: { name: string; location: string } | null;
  teams: { home: SnapshotTeam | null; away: SnapshotTeam | null };
  toss: { wonByTeamId: string; decision: "BAT" | "BOWL" } | null;
  innings: SnapshotInnings[];
  /** Present while the match is in play (LIVE / INNINGS_BREAK). */
  live: SnapshotLive | null;
  result: {
    text: string | null;
    winnerTeamId: string | null;
    playerOfMatch: { id: string; name: string } | null;
  } | null;
}

const matchInclude = {
  venue: true,
  matchTeams: { include: { team: true } },
  playerOfMatch: true,
  playingXI: true,
  innings: {
    orderBy: { inningsNumber: "asc" as const },
    include: {
      deliveries: {
        orderBy: { sequence: "asc" as const },
        include: { wicket: true },
      },
    },
  },
} satisfies Prisma.MatchInclude;

/** Replay every innings of the match and assemble the denormalized payload. */
export async function buildSnapshotPayload(
  db: Db,
  matchId: string,
): Promise<{ payload: LiveSnapshotPayload; status: MatchStatus }> {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: matchInclude,
  });
  if (!match) throw new ActionError("NOT_FOUND", "Match not found");

  const home = match.matchTeams.find((mt) => mt.isHome)?.team ?? null;
  const away = match.matchTeams.find((mt) => !mt.isHome)?.team ?? null;

  // One name map for everyone who could appear in the payload.
  const playerIds = new Set<string>();
  for (const inn of match.innings) {
    for (const d of inn.deliveries) {
      for (const id of [d.strikerId, d.nonStrikerId, d.bowlerId]) {
        if (id) playerIds.add(id);
      }
      if (d.wicket) playerIds.add(d.wicket.dismissedPlayerId);
    }
    if (inn.openingStrikerId) playerIds.add(inn.openingStrikerId);
    if (inn.openingNonStrikerId) playerIds.add(inn.openingNonStrikerId);
  }
  const players = playerIds.size
    ? await db.player.findMany({
        where: { id: { in: [...playerIds] } },
        select: { id: true, fullName: true },
      })
    : [];
  const nameOf = new Map(players.map((p) => [p.id, p.fullName]));

  const inningsPayloads: SnapshotInnings[] = [];
  let live: SnapshotLive | null = null;

  for (const inn of match.innings) {
    const rows = inn.deliveries as DeliveryRow[];
    let state: InningsState | null = null;

    if (inn.openingStrikerId && inn.openingNonStrikerId) {
      const config = buildInningsConfig(match, inn);
      state = replayInnings(config, decodeEvents(rows));
    }

    const extras = state?.extras ?? {
      wides: inn.wides,
      noBalls: inn.noBalls,
      byes: inn.byes,
      legByes: inn.legByes,
      penalties: inn.penalties,
    };

    // A DECLARED/MANUAL close lives on the row, not in the replay — the row
    // wins when it says COMPLETED.
    const effectiveStatus: SnapshotInnings["status"] =
      inn.status === "COMPLETED"
        ? "COMPLETED"
        : (state?.status ?? inn.status);

    inningsPayloads.push({
      inningsNumber: inn.inningsNumber,
      battingTeamId: inn.battingTeamId,
      bowlingTeamId: inn.bowlingTeamId,
      status: effectiveStatus,
      closeReason:
        inn.status === "COMPLETED"
          ? (inn.closeReason ?? state?.closeReason ?? null)
          : (state?.closeReason ?? null),
      runs: state?.totalRuns ?? inn.totalRuns,
      wickets: state?.wickets ?? inn.wickets,
      legalBalls: state?.legalBalls ?? inn.legalBalls,
      oversDisplay: oversDisplay(
        state?.legalBalls ?? inn.legalBalls,
        inn.ballsPerOver,
      ),
      oversLimit: inn.oversLimit,
      ballsPerOver: inn.ballsPerOver,
      target: inn.target,
      extras: {
        ...extras,
        total:
          extras.wides +
          extras.noBalls +
          extras.byes +
          extras.legByes +
          extras.penalties,
      },
    });

    // The live block tracks the latest innings that has a replayable state.
    if (state) {
      const s = getInningsSummary(state);
      const batterLine = (id: string | null): SnapshotBatterLine | null => {
        if (!id) return null;
        const b = state.batters[id];
        return {
          playerId: id,
          name: nameOf.get(id) ?? "Unknown",
          runs: b?.runs ?? 0,
          balls: b?.ballsFaced ?? 0,
          fours: b?.fours ?? 0,
          sixes: b?.sixes ?? 0,
        };
      };
      const bowlerLine = (id: string | null): SnapshotBowlerLine | null => {
        if (!id) return null;
        const bw = state.bowlers[id];
        if (!bw) return null;
        return {
          playerId: id,
          name: nameOf.get(id) ?? "Unknown",
          legalBalls: bw.legalBalls,
          oversDisplay: oversDisplay(bw.legalBalls, inn.ballsPerOver),
          maidens: bw.maidens,
          runsConceded: bw.runsConceded,
          wickets: bw.wickets,
        };
      };
      live = {
        inningsNumber: inn.inningsNumber,
        battingTeamId: inn.battingTeamId,
        bowlingTeamId: inn.bowlingTeamId,
        runs: s.totalRuns,
        wickets: s.wickets,
        oversDisplay: s.oversDisplay,
        currentRunRate: s.currentRunRate,
        target: s.target,
        runsNeeded: s.runsNeeded,
        ballsRemaining: s.ballsRemaining,
        requiredRunRate: s.requiredRunRate,
        striker: batterLine(s.strikerId),
        nonStriker: batterLine(s.nonStrikerId),
        bowler: bowlerLine(s.currentBowlerId),
        lastBalls: s.lastBalls,
        freeHitPending: s.freeHitPending,
      };
    }
  }

  const showLive =
    match.status === "LIVE" || match.status === "INNINGS_BREAK";

  const payload: LiveSnapshotPayload = {
    matchId: match.id,
    matchNumber: match.matchNumber,
    stage: match.stage,
    format: match.format,
    oversPerSide: match.oversPerSide,
    ballsPerOver: match.ballsPerOver,
    playersPerSide: match.playersPerSide,
    status: match.status,
    scheduledAt: match.scheduledAt.toISOString(),
    venue: match.venue
      ? { name: match.venue.name, location: match.venue.location }
      : null,
    teams: { home: snapshotTeam(home), away: snapshotTeam(away) },
    toss:
      match.tossWonByTeamId && match.tossDecision
        ? { wonByTeamId: match.tossWonByTeamId, decision: match.tossDecision }
        : null,
    innings: inningsPayloads,
    live: showLive ? live : null,
    result:
      match.status === "COMPLETED" || match.status === "ABANDONED"
        ? {
            text: match.resultText,
            winnerTeamId: match.winnerTeamId,
            playerOfMatch: match.playerOfMatch
              ? { id: match.playerOfMatch.id, name: match.playerOfMatch.fullName }
              : null,
          }
        : null,
  };

  return { payload, status: match.status };
}

function snapshotTeam(
  team: {
    id: string;
    name: string;
    shortName: string;
    logoUrl: string | null;
    primaryColor: string;
  } | null,
): SnapshotTeam | null {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logoUrl: team.logoUrl,
    primaryColor: team.primaryColor,
  };
}

/**
 * Rebuild + write the snapshot row with the optimistic version check.
 * `expectedVersion` is what the caller read at the start of its transaction;
 * if someone else bumped it in between, the conditional update matches zero
 * rows and the whole transaction rolls back (CONFLICT).
 */
export async function writeSnapshot(
  db: Db,
  matchId: string,
  expectedVersion: number | null,
): Promise<number> {
  const { payload, status } = await buildSnapshotPayload(db, matchId);
  const json = payload as unknown as Prisma.InputJsonValue;

  if (expectedVersion === null) {
    const created = await db.scoreSnapshot.create({
      data: { matchId, version: 1, status, payload: json },
    });
    return created.version;
  }

  const updated = await db.scoreSnapshot.updateMany({
    where: { matchId, version: expectedVersion },
    data: { version: expectedVersion + 1, status, payload: json },
  });
  if (updated.count === 0) {
    throw new ActionError(
      "CONFLICT",
      "Live snapshot was updated by someone else — refresh and retry",
    );
  }
  return expectedVersion + 1;
}

/** Read current version (null = snapshot doesn't exist yet). */
export async function readSnapshotVersion(
  db: Db,
  matchId: string,
): Promise<number | null> {
  const row = await db.scoreSnapshot.findUnique({
    where: { matchId },
    select: { version: true },
  });
  return row?.version ?? null;
}

/** Convenience for mutations: read-version → rebuild → conditional write. */
export async function refreshSnapshot(
  db: Db,
  matchId: string,
): Promise<number> {
  const version = await readSnapshotVersion(db, matchId);
  return writeSnapshot(db, matchId, version);
}
