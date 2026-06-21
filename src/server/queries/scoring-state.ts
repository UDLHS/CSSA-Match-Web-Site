import { prisma } from "@/lib/db";
import {
  currentRunRate,
  oversDisplay,
  replayInnings,
  requiredRunRate,
  type InningsState,
} from "@/lib/scoring";
import { shortName } from "@/lib/format";
import { decodeEvents, type DeliveryRow } from "@/server/scoring/codec";
import { buildInningsConfig } from "@/server/scoring/persist";
import type {
  ConsoleBowler,
  ConsoleInnings,
  ConsolePlayerOption,
  ConsoleTeam,
  ScoringStateDTO,
} from "@/lib/scoring-console-types";

/** Full state for the scoring console — active innings replayed from deliveries. */
export async function getScoringState(
  matchId: string,
): Promise<ScoringStateDTO | null> {
  const match = await prisma.match.findFirst({
    where: { id: matchId, deletedAt: null },
    include: {
      matchTeams: { include: { team: true } },
      playingXI: {
        include: { player: { select: { id: true, fullName: true } } },
        orderBy: { battingOrder: "asc" },
      },
      innings: {
        orderBy: { inningsNumber: "asc" },
        include: {
          deliveries: { orderBy: { sequence: "asc" }, include: { wicket: true } },
        },
      },
    },
  });
  if (!match) return null;

  const toTeam = (t: {
    id: string; name: string; shortName: string; primaryColor: string;
  }): ConsoleTeam => ({ id: t.id, name: t.name, shortName: t.shortName, primaryColor: t.primaryColor });

  const teamById = new Map(match.matchTeams.map((mt) => [mt.teamId, mt.team]));
  const nameOf = new Map(match.playingXI.map((p) => [p.playerId, p.player.fullName]));

  const xiFor = (teamId: string): ConsolePlayerOption[] =>
    match.playingXI
      .filter((p) => p.teamId === teamId)
      .map((p) => ({ id: p.playerId, name: p.player.fullName, battingOrder: p.battingOrder }));

  const allPlayers: ConsolePlayerOption[] = match.playingXI.map((p) => ({
    id: p.playerId,
    name: p.player.fullName,
  }));

  // The active innings is the last IN_PROGRESS one, if any.
  const activeInnings = [...match.innings].reverse().find((i) => i.status === "IN_PROGRESS") ?? null;

  let inningsDTO: ConsoleInnings | null = null;
  let battingTeam: ConsoleTeam | null = null;
  let bowlingTeam: ConsoleTeam | null = null;

  if (activeInnings && activeInnings.openingStrikerId && activeInnings.openingNonStrikerId) {
    const config = buildInningsConfig(match, activeInnings);
    const rows = activeInnings.deliveries as DeliveryRow[];
    const state = replayInnings(config, decodeEvents(rows));

    const bt = teamById.get(activeInnings.battingTeamId);
    const bw = teamById.get(activeInnings.bowlingTeamId);
    battingTeam = bt ? toTeam(bt) : null;
    bowlingTeam = bw ? toTeam(bw) : null;

    inningsDTO = buildInningsDTO(activeInnings, state, rows, nameOf, xiFor(activeInnings.bowlingTeamId));
  } else {
    // No active innings — figure out which side bats next.
    const home = match.matchTeams.find((mt) => mt.isHome)?.team;
    const away = match.matchTeams.find((mt) => !mt.isHome)?.team;
    if (home) battingTeam = toTeam(home);
    if (away) bowlingTeam = toTeam(away);
  }

  // Can we start an innings? Match must be LIVE/INNINGS_BREAK and the next
  // innings slot empty (and the previous innings completed for innings 2).
  let startInnings: ScoringStateDTO["startInnings"] = null;
  if (
    !activeInnings &&
    (match.status === "LIVE" || match.status === "INNINGS_BREAK")
  ) {
    const nextNumber = match.innings.length + 1;
    const prev = match.innings[nextNumber - 2];
    const canStart = nextNumber === 1 || (prev && prev.status === "COMPLETED");
    if (canStart && nextNumber <= 2) {
      // Innings 2 batting side is whoever didn't bat in innings 1.
      let teams = match.matchTeams;
      if (nextNumber === 2 && prev) {
        teams = match.matchTeams.filter((mt) => mt.teamId !== prev.battingTeamId);
      }
      startInnings = {
        nextNumber,
        options: teams.map((mt) => ({ team: toTeam(mt.team), xi: xiFor(mt.teamId) })),
      };
    }
  }

  // A scorer can always end a match in play — the result is auto-derived when
  // both innings are done; otherwise the scorer types a result (e.g. "abandoned
  // due to rain"). Empty matches (no balls bowled) should use Abandon instead.
  const anyBalls = match.innings.some((i) => i.legalBalls > 0 || i.totalRuns > 0);
  const canComplete =
    (match.status === "LIVE" || match.status === "INNINGS_BREAK") && anyBalls;
  const canAbandon = match.status === "LIVE" || match.status === "INNINGS_BREAK";

  return {
    matchId: match.id,
    matchNumber: match.matchNumber,
    format: match.format,
    matchStatus: match.status,
    playersPerSide: match.playersPerSide,
    battingTeam,
    bowlingTeam,
    innings: inningsDTO,
    startInnings,
    canComplete,
    canAbandon,
    allPlayers,
  };
}

function buildInningsDTO(
  innings: { id: string; inningsNumber: number; status: string; closeReason: string | null; oversLimit: number; ballsPerOver: number; target: number | null },
  state: InningsState,
  rows: DeliveryRow[],
  nameOf: Map<string, string>,
  bowlingXI: ConsolePlayerOption[],
): ConsoleInnings {
  const bpo = innings.ballsPerOver;
  const ballsRemaining =
    innings.target != null
      ? Math.max(innings.oversLimit * bpo - state.legalBalls, 0)
      : null;
  const runsNeeded =
    innings.target != null ? Math.max(innings.target - state.totalRuns, 0) : null;

  const batter = (id: string | null) => {
    if (!id) return null;
    const b = state.batters[id];
    return b
      ? { playerId: id, name: nameOf.get(id) ?? "Unknown", runs: b.runs, balls: b.ballsFaced, fours: b.fours, sixes: b.sixes, status: b.status }
      : null;
  };

  const currentBowlerId = state.deliveries[state.deliveries.length - 1]?.bowlerId ?? null;
  const atOverStart = state.legalBalls % bpo === 0;
  const currentBowlerState = currentBowlerId ? state.bowlers[currentBowlerId] : null;
  const currentBowler: ConsoleBowler | null =
    currentBowlerId && currentBowlerState
      ? {
          playerId: currentBowlerId,
          name: nameOf.get(currentBowlerId) ?? "Unknown",
          overs: oversDisplay(currentBowlerState.legalBalls, bpo),
          maidens: currentBowlerState.maidens,
          runs: currentBowlerState.runsConceded,
          wickets: currentBowlerState.wickets,
        }
      : null;

  // Last 6 events (including non-balls) newest first.
  const lastBalls = rows
    .slice(-6)
    .reverse()
    .map((r) => {
      const overBall = r.isNonBall ? "—" : `${r.overNumber}.${r.ballInOver}`;
      return {
        sequence: r.sequence,
        overBall,
        label: r.isNonBall ? (r.extraType === "PENALTY" ? "P" : r.wicket ? "R" : "⇄") : labelForRow(r),
        text: r.commentary ?? describeRow(r, nameOf),
        isNonBall: r.isNonBall,
      };
    });

  // Available batters = batting XI not out and not at the crease.
  const atCreaseIds = new Set([state.strikerId, state.nonStrikerId].filter(Boolean) as string[]);
  const availableBatters: ConsolePlayerOption[] = (state.config.battingOrder ?? [])
    .filter((id) => {
      const b = state.batters[id];
      const out = b && (b.status === "OUT" || b.status === "RETIRED_OUT");
      return !out && !atCreaseIds.has(id);
    })
    .map((id, i) => ({ id, name: nameOf.get(id) ?? "Unknown", battingOrder: i }));

  const atCrease: ConsolePlayerOption[] = [...atCreaseIds].map((id) => ({
    id,
    name: nameOf.get(id) ?? "Unknown",
  }));

  return {
    id: innings.id,
    number: innings.inningsNumber,
    status: state.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
    closeReason: state.closeReason,
    runs: state.totalRuns,
    wickets: state.wickets,
    legalBalls: state.legalBalls,
    oversDisplay: oversDisplay(state.legalBalls, bpo),
    oversLimit: innings.oversLimit,
    ballsPerOver: bpo,
    target: innings.target,
    runsNeeded,
    ballsRemaining,
    crr: currentRunRate(state.totalRuns, state.legalBalls, bpo)?.toFixed(2) ?? "—",
    rrr:
      runsNeeded != null && ballsRemaining != null
        ? requiredRunRate(runsNeeded, ballsRemaining, bpo)?.toFixed(2) ?? "—"
        : "—",
    freeHitPending: state.freeHitPending,
    nextSequence: rows.length + 1,
    atOverStart,
    lastOverBowlerId: state.lastOverBowlerId,
    striker: batter(state.strikerId),
    nonStriker: batter(state.nonStrikerId),
    currentBowlerId: atOverStart ? null : currentBowlerId,
    currentBowler: atOverStart ? null : currentBowler,
    lastBalls,
    availableBatters,
    atCrease,
    bowlingXI,
  };
}

function labelForRow(r: DeliveryRow): string {
  if (r.wicket && r.wicket.type !== "RETIRED_HURT") return "W";
  if (r.extraType === "WIDE") return r.extraRuns > 1 ? `WD${r.extraRuns}` : "WD";
  if (r.extraType === "NO_BALL") {
    const total = r.runsOffBat + r.extraRuns;
    return total > 1 ? `NB${total}` : "NB";
  }
  if (r.extraType === "BYE" || r.extraType === "LEG_BYE") return String(r.extraRuns);
  return String(r.runsOffBat);
}

function describeRow(r: DeliveryRow, nameOf: Map<string, string>): string {
  if (r.isNonBall) {
    if (r.extraType === "PENALTY") return `Penalty +${r.extraRuns}`;
    if (r.wicket) return `${nameOf.get(r.wicket.dismissedPlayerId) ?? "Batter"} retired`;
    return "Strike swapped";
  }
  const bowler = r.bowlerId ? shortName(nameOf.get(r.bowlerId) ?? "") : "";
  const striker = r.strikerId ? shortName(nameOf.get(r.strikerId) ?? "") : "";
  const who = bowler && striker ? `${bowler} to ${striker} — ` : "";
  if (r.wicket && r.wicket.type !== "RETIRED_HURT") {
    return `${who}OUT (${nameOf.get(r.wicket.dismissedPlayerId) ?? "batter"})`;
  }
  if (r.extraType === "WIDE") return `${who}wide`;
  if (r.extraType === "NO_BALL") return `${who}no ball`;
  if (r.extraType === "BYE") return `${who}${r.extraRuns} bye`;
  if (r.extraType === "LEG_BYE") return `${who}${r.extraRuns} leg bye`;
  const runs = r.runsOffBat;
  return `${who}${runs === 0 ? "no run" : runs === 4 ? "FOUR" : runs === 6 ? "SIX" : `${runs} run${runs === 1 ? "" : "s"}`}`;
}
