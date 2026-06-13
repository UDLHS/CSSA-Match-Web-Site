import type { Innings, Match, PlayingXI, Prisma } from "@prisma/client";
import {
  BOWLER_CREDITED_TYPES,
  replayInnings,
  type BatterState,
  type InningsConfig,
  type InningsEvent,
  type InningsState,
} from "@/lib/scoring";
import { ActionError } from "@/server/errors";
import type { Db } from "@/server/audit";
import { decodeEvents, type DeliveryRow } from "./codec";

/**
 * Replay persistence: load the event stream, fold it through the pure engine,
 * then write every derived value back in ONE transaction. Aggregates are
 * never patched in place — recomputation is the only write path
 * (CLAUDE.md rule 2).
 */

export interface MatchForConfig {
  playersPerSide: number;
  playingXI: PlayingXI[];
}

export function buildInningsConfig(
  match: MatchForConfig,
  innings: Innings,
): InningsConfig {
  if (!innings.openingStrikerId || !innings.openingNonStrikerId) {
    throw new ActionError(
      "INVALID_STATE",
      "Innings has no opening batters — start the innings first",
    );
  }
  const xi = match.playingXI
    .filter((p) => p.teamId === innings.battingTeamId)
    .sort((a, b) => a.battingOrder - b.battingOrder)
    .map((p) => p.playerId);

  return {
    inningsNumber: innings.inningsNumber,
    oversLimit: innings.oversLimit,
    ballsPerOver: innings.ballsPerOver,
    battersPerSide: match.playersPerSide,
    target: innings.target,
    openingStrikerId: innings.openingStrikerId,
    openingNonStrikerId: innings.openingNonStrikerId,
    battingOrder: xi.length > 0 ? xi : undefined,
  };
}

export type InningsWithMatch = Innings & {
  match: Match & { playingXI: PlayingXI[] };
  deliveries: DeliveryRow[];
};

export interface InningsContext {
  innings: InningsWithMatch;
  config: InningsConfig;
  rows: DeliveryRow[];
  events: InningsEvent[];
  /** Replayed state of the CURRENT stream (before any new mutation). */
  state: InningsState;
}

export async function loadInningsContext(
  db: Db,
  inningsId: string,
): Promise<InningsContext> {
  const innings = await db.innings.findUnique({
    where: { id: inningsId },
    include: {
      match: { include: { playingXI: true } },
      deliveries: {
        orderBy: { sequence: "asc" },
        include: { wicket: true },
      },
    },
  });
  if (!innings || innings.match.deletedAt) {
    throw new ActionError("NOT_FOUND", "Innings not found");
  }
  const config = buildInningsConfig(innings.match, innings);
  const rows = innings.deliveries;
  const events = decodeEvents(rows);
  return {
    innings,
    config,
    rows,
    events,
    state: replayInnings(config, events),
  };
}

// ----------------------------------------------------------------
// Derived writes (call inside the mutation's transaction)
// ----------------------------------------------------------------

/**
 * Write replay-derived values back:
 *  - Innings aggregate columns + status/closeReason
 *  - per-row derived fields from `rewriteFromSequence` onward (an edit shifts
 *    over numbering / free-hit flags / wicket data for everything after it)
 *  - PlayerMatchBattingStats / PlayerMatchBowlingStats (delete + recreate)
 *
 * `rows`/`state` describe the POST-mutation stream.
 */
export async function syncInningsDerived(
  tx: Db,
  innings: InningsWithMatch,
  rows: readonly DeliveryRow[],
  events: readonly InningsEvent[],
  state: InningsState,
  rewriteFromSequence: number = Number.MAX_SAFE_INTEGER,
): Promise<void> {
  // DECLARED/MANUAL closes are admin decisions, not replay-derivable — a
  // replay that says IN_PROGRESS must not silently reopen such an innings.
  const manuallyClosed =
    innings.status === "COMPLETED" &&
    (innings.closeReason === "DECLARED" || innings.closeReason === "MANUAL");

  await tx.innings.update({
    where: { id: innings.id },
    data: {
      status:
        state.status === "COMPLETED" || manuallyClosed
          ? "COMPLETED"
          : "IN_PROGRESS",
      closeReason:
        state.status === "COMPLETED"
          ? state.closeReason
          : manuallyClosed
            ? innings.closeReason
            : null,
      totalRuns: state.totalRuns,
      wickets: state.wickets,
      legalBalls: state.legalBalls,
      wides: state.extras.wides,
      noBalls: state.extras.noBalls,
      byes: state.extras.byes,
      legByes: state.extras.legByes,
      penalties: state.extras.penalties,
    },
  });

  // ---- per-row derived rewrite -------------------------------------------
  let deliveryIdx = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isBall = !row.isNonBall;
    const processed = isBall ? state.deliveries[deliveryIdx++] : null;
    if (row.sequence < rewriteFromSequence) continue;

    if (isBall && processed) {
      await tx.delivery.update({
        where: { id: row.id },
        data: {
          overNumber: processed.overNumber,
          ballInOver: processed.ballInOver,
          isLegal: processed.isLegal,
          isFreeHit: processed.isFreeHit,
          strikerId: processed.strikerId,
          nonStrikerId: processed.nonStrikerId,
          extraRuns: processed.extraRuns,
        },
      });
      if (row.wicket && processed.wicket) {
        await tx.wicket.update({
          where: { id: row.wicket.id },
          data: {
            bowlerCredited:
              processed.wicket.bowlerCredited ??
              BOWLER_CREDITED_TYPES.has(processed.wicket.type),
            endWhereOut: processed.wicket.endWhereOut,
            wicketNumber: processed.wicketsAfter,
            scoreAtFall: processed.totalAfter,
            overBall: processed.overBall,
          },
        });
      }
    } else if (row.wicket) {
      // Retirement row — derive from a prefix replay (rare, cheap).
      const prefix = replayInnings(
        buildInningsConfig(innings.match, innings),
        events.slice(0, i + 1),
      );
      await tx.wicket.update({
        where: { id: row.wicket.id },
        data: {
          wicketNumber: prefix.wickets,
          scoreAtFall: prefix.totalRuns,
          overBall: `${Math.floor(prefix.legalBalls / innings.ballsPerOver)}.${prefix.legalBalls % innings.ballsPerOver}`,
        },
      });
    }
  }

  // ---- match stat lines (deterministic delete + recreate) -----------------
  const nameOf = await loadNames(tx, state);

  await tx.playerMatchBattingStats.deleteMany({
    where: { matchId: innings.matchId, teamId: innings.battingTeamId },
  });
  if (state.battingOrderUsed.length > 0) {
    await tx.playerMatchBattingStats.createMany({
      data: state.battingOrderUsed.map((playerId, idx) => {
        const b = state.batters[playerId];
        return {
          matchId: innings.matchId,
          playerId,
          teamId: innings.battingTeamId,
          battingOrder: idx + 1,
          runs: b.runs,
          balls: b.ballsFaced,
          fours: b.fours,
          sixes: b.sixes,
          notOut: b.status === "NOT_OUT" || b.status === "RETIRED_HURT",
          dismissalType: b.dismissal?.type ?? null,
          dismissalText: dismissalText(b, nameOf),
        };
      }),
    });
  }

  await tx.playerMatchBowlingStats.deleteMany({
    where: { matchId: innings.matchId, teamId: innings.bowlingTeamId },
  });
  const bowlers = Object.values(state.bowlers);
  if (bowlers.length > 0) {
    await tx.playerMatchBowlingStats.createMany({
      data: bowlers.map((bw) => ({
        matchId: innings.matchId,
        playerId: bw.playerId,
        teamId: innings.bowlingTeamId,
        legalBalls: bw.legalBalls,
        maidens: bw.maidens,
        runsConceded: bw.runsConceded,
        wickets: bw.wickets,
        wides: bw.wides,
        noBalls: bw.noBalls,
      })),
    });
  }
}

async function loadNames(
  tx: Db,
  state: InningsState,
): Promise<Map<string, string>> {
  const ids = new Set<string>([
    ...Object.keys(state.batters),
    ...Object.keys(state.bowlers),
  ]);
  for (const b of Object.values(state.batters)) {
    if (b.dismissal?.bowlerId) ids.add(b.dismissal.bowlerId);
    if (b.dismissal?.fielderId) ids.add(b.dismissal.fielderId);
  }
  if (ids.size === 0) return new Map();
  const players = await tx.player.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, fullName: true },
  });
  return new Map(players.map((p) => [p.id, p.fullName]));
}

/** Scorecard text: "c Silva b Madushanka", "run out (Perera)", "not out". */
export function dismissalText(
  b: BatterState,
  nameOf: Map<string, string>,
): string | null {
  if (!b.dismissal) {
    if (b.status === "RETIRED_HURT") return "retired hurt";
    return null; // not out — column `notOut` carries the flag
  }
  const last = (id: string | null) => {
    if (!id) return "?";
    const full = nameOf.get(id) ?? "?";
    const parts = full.split(/\s+/);
    return parts[parts.length - 1];
  };
  const bowler = last(b.dismissal.bowlerId);
  const fielder = last(b.dismissal.fielderId);
  switch (b.dismissal.type) {
    case "BOWLED":
      return `b ${bowler}`;
    case "CAUGHT":
      return `c ${fielder} b ${bowler}`;
    case "CAUGHT_AND_BOWLED":
      return `c & b ${bowler}`;
    case "LBW":
      return `lbw b ${bowler}`;
    case "STUMPED":
      return `st ${fielder} b ${bowler}`;
    case "HIT_WICKET":
      return `hit wicket b ${bowler}`;
    case "RUN_OUT":
      return b.dismissal.fielderId ? `run out (${fielder})` : "run out";
    case "RETIRED_OUT":
      return "retired out";
    case "OBSTRUCTING_FIELD":
      return "obstructing the field";
    case "HIT_BALL_TWICE":
      return "hit the ball twice";
    case "TIMED_OUT":
      return "timed out";
    default:
      return "out";
  }
}

/**
 * Refresh snapshots of every non-finished match a team appears in — master
 * data edits (name/logo/color) must propagate LIVE to public payloads.
 */
export async function liveMatchIdsForTeam(
  db: Db,
  teamId: string,
): Promise<string[]> {
  const matchTeams = await db.matchTeam.findMany({
    where: {
      teamId,
      match: {
        deletedAt: null,
        status: { in: ["UPCOMING", "LIVE", "INNINGS_BREAK"] },
      },
    },
    select: { matchId: true },
  });
  return matchTeams.map((mt) => mt.matchId);
}
