"use server";

import { requireRole, SCORING_ROLES } from "@/server/auth";
import { runAction, type ActionResult } from "@/server/result";
import { getScoringState } from "@/server/queries/scoring-state";
import { ActionError } from "@/server/errors";
import type { ScoringStateDTO } from "@/lib/scoring-console-types";
import {
  recordDelivery,
  recordRetirement,
  swapStrike,
  undoLastEvent,
} from "./scoring";
import { startInnings, endInnings, completeMatch } from "./match-lifecycle";

/**
 * Re-read the full console state after a mutation. Authz-gated like every
 * scoring touch — the console calls this to refresh batters/bowler/availables.
 */
export async function loadScoringState(
  matchId: string,
): Promise<ActionResult<ScoringStateDTO>> {
  return runAction(async () => {
    await requireRole(SCORING_ROLES);
    const state = await getScoringState(matchId);
    if (!state) throw new ActionError("NOT_FOUND", "Match not found");
    return state;
  });
}

/**
 * Console wrappers: run a mutation AND return the fresh console state in ONE
 * server round-trip (scorer in Sri Lanka, DB in Sydney — halving client→server
 * hops per tap is the win). The mutation keeps its own authz + audit; on its
 * error we surface that, otherwise we re-read state.
 */
async function thenState<T>(
  matchId: string,
  res: ActionResult<T>,
): Promise<ActionResult<ScoringStateDTO>> {
  if (!res.ok) return res;
  return loadScoringState(matchId);
}

export async function consoleRecordDelivery(matchId: string, input: unknown) {
  return thenState(matchId, await recordDelivery(input));
}
export async function consoleRecordRetirement(matchId: string, input: unknown) {
  return thenState(matchId, await recordRetirement(input));
}
export async function consoleSwapStrike(matchId: string, input: unknown) {
  return thenState(matchId, await swapStrike(input));
}
export async function consoleUndo(matchId: string, input: unknown) {
  return thenState(matchId, await undoLastEvent(input));
}
export async function consoleStartInnings(matchId: string, input: unknown) {
  return thenState(matchId, await startInnings(input));
}
export async function consoleEndInnings(matchId: string, input: unknown) {
  return thenState(matchId, await endInnings(input));
}
export async function consoleCompleteMatch(matchId: string, input: unknown) {
  return thenState(matchId, await completeMatch(input));
}
