/**
 * Pure cricket scoring engine — no UI, no DB.
 *
 * The innings is a fold over an ordered event stream:
 *
 *     replayInnings(config, events) = events.reduce(applyEvent, createInnings(config))
 *
 * Undo = replay without the last event. Edit = replace one event and replay.
 * Aggregates are NEVER patched in place — recomputation is the only path
 * (backend-spec "Undo / edit" rule).
 *
 * Strike rotation is modeled as TWO INDEPENDENT TOGGLES (backend-spec §3.1):
 *   toggle A — odd physical runs ran on the ball (incl. the crossed flag on
 *              a run-out attempt),
 *   toggle B — end of over.
 * On the last legal ball of an over with odd runs both fire and cancel,
 * preserving the striker. They are never collapsed into one boolean.
 */

import { ScoringError } from "./errors";
import {
  ALLOWED_ON_FREE_HIT,
  ALLOWED_ON_NO_BALL,
  ALLOWED_ON_WIDE,
  BOWLER_CREDITED_TYPES,
  type BatterState,
  type BowlerState,
  type CreaseEnd,
  type DeliveryEvent,
  type InningsConfig,
  type InningsEvent,
  type InningsState,
  type InningsSummary,
  type PenaltyEvent,
  type ProcessedDelivery,
  type RetirementEvent,
  type WicketType,
} from "./types";
import { currentRunRate, oversDisplay, requiredRunRate } from "./stats";

/** Dismissals that can take the NON-striker (everything else is striker-only). */
const NON_STRIKER_DISMISSALS: ReadonlySet<WicketType> = new Set([
  "RUN_OUT",
  "OBSTRUCTING_FIELD",
  "OTHER",
]);

// ----------------------------------------------------------------
// Construction
// ----------------------------------------------------------------

export function createInnings(config: InningsConfig): InningsState {
  if (config.openingStrikerId === config.openingNonStrikerId) {
    throw new ScoringError(
      "INVALID_INPUT",
      "Opening striker and non-striker must be different players",
    );
  }
  if (config.oversLimit <= 0 || config.ballsPerOver <= 0) {
    throw new ScoringError("INVALID_INPUT", "Invalid overs configuration");
  }
  if (config.battersPerSide < 2) {
    throw new ScoringError("INVALID_INPUT", "battersPerSide must be at least 2");
  }

  const state: InningsState = {
    config,
    status: "IN_PROGRESS",
    closeReason: null,
    totalRuns: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 },
    batters: {},
    bowlers: {},
    battingOrderUsed: [config.openingStrikerId, config.openingNonStrikerId],
    strikerId: config.openingStrikerId,
    nonStrikerId: config.openingNonStrikerId,
    freeHitPending: false,
    lastOverBowlerId: null,
    fallOfWickets: [],
    deliveries: [],
    eventCount: 0,
    currentOver: { bowlerIds: [], runsCharged: 0 },
  };
  ensureBatter(state, config.openingStrikerId);
  ensureBatter(state, config.openingNonStrikerId);
  return state;
}

function ensureBatter(state: InningsState, playerId: string): BatterState {
  if (!state.batters[playerId]) {
    state.batters[playerId] = {
      playerId,
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      status: "NOT_OUT",
      dismissal: null,
    };
  }
  return state.batters[playerId];
}

function ensureBowler(state: InningsState, playerId: string): BowlerState {
  if (!state.bowlers[playerId]) {
    state.bowlers[playerId] = {
      playerId,
      legalBalls: 0,
      runsConceded: 0,
      wickets: 0,
      maidens: 0,
      wides: 0,
      noBalls: 0,
    };
  }
  return state.bowlers[playerId];
}

// ----------------------------------------------------------------
// Replay primitives
// ----------------------------------------------------------------

export function applyEvent(
  state: InningsState,
  event: InningsEvent,
): InningsState {
  const next = structuredClone(state);
  switch (event.kind) {
    case "delivery":
      applyDelivery(next, event);
      break;
    case "penalty":
      applyPenalty(next, event);
      break;
    case "retirement":
      applyRetirement(next, event);
      break;
    case "swapEnds":
      assertOpen(next);
      swapEnds(next);
      break;
  }
  next.eventCount += 1;
  return next;
}

/** Deterministic full replay — THE undo/edit primitive. */
export function replayInnings(
  config: InningsConfig,
  events: readonly InningsEvent[],
): InningsState {
  return events.reduce(applyEvent, createInnings(config));
}

/** Undo the latest event by replaying everything before it. */
export function undoLastEvent(
  config: InningsConfig,
  events: readonly InningsEvent[],
): { state: InningsState; events: InningsEvent[] } {
  const trimmed = events.slice(0, -1);
  return { state: replayInnings(config, trimmed), events: trimmed };
}

/** Replace the event at `index` and replay from scratch. */
export function editEvent(
  config: InningsConfig,
  events: readonly InningsEvent[],
  index: number,
  replacement: InningsEvent,
): { state: InningsState; events: InningsEvent[] } {
  if (index < 0 || index >= events.length) {
    throw new ScoringError("INVALID_INPUT", `No event at index ${index}`);
  }
  const edited = [...events];
  edited[index] = replacement;
  return { state: replayInnings(config, edited), events: edited };
}

// ----------------------------------------------------------------
// Event handlers (mutate the already-cloned state)
// ----------------------------------------------------------------

function assertOpen(state: InningsState): void {
  if (state.status === "COMPLETED") {
    throw new ScoringError(
      "INNINGS_CLOSED",
      `Innings is closed (${state.closeReason}) — no further events allowed`,
    );
  }
}

function swapEnds(state: InningsState): void {
  const s = state.strikerId;
  state.strikerId = state.nonStrikerId;
  state.nonStrikerId = s;
}

function applyDelivery(state: InningsState, ev: DeliveryEvent): void {
  assertOpen(state);

  const { ballsPerOver } = state.config;
  const strikerId = state.strikerId;
  const nonStrikerId = state.nonStrikerId;
  if (!strikerId || !nonStrikerId) {
    throw new ScoringError("INVALID_INPUT", "Both batters must be at the crease");
  }

  // ---- shape validation -------------------------------------------------
  const extraType = ev.extraType ?? null;
  const isLegal = extraType !== "WIDE" && extraType !== "NO_BALL";
  const runsOffBat = ev.runsOffBat;
  if (!Number.isInteger(runsOffBat) || runsOffBat < 0 || runsOffBat > 10) {
    throw new ScoringError("INVALID_INPUT", `Invalid runsOffBat: ${runsOffBat}`);
  }
  if (extraType === "WIDE" && runsOffBat !== 0) {
    throw new ScoringError(
      "INVALID_INPUT",
      "A wide cannot have runs off the bat",
    );
  }
  let extraRuns = ev.extraRuns ?? (isLegal ? 0 : 1);
  if (!Number.isInteger(extraRuns) || extraRuns < 0 || extraRuns > 10) {
    throw new ScoringError("INVALID_INPUT", `Invalid extraRuns: ${extraRuns}`);
  }
  if (!extraType && extraRuns !== 0) {
    throw new ScoringError(
      "INVALID_INPUT",
      "extraRuns requires an extraType (use a penalty event for penalty runs)",
    );
  }
  if (extraType && extraRuns < 1) {
    throw new ScoringError(
      "INVALID_INPUT",
      `${extraType} must carry at least 1 extra run`,
    );
  }

  // ---- bowler validation (no consecutive overs) -------------------------
  const isFirstBallOfOver = state.currentOver.bowlerIds.length === 0;
  if (isFirstBallOfOver && ev.bowlerId === state.lastOverBowlerId) {
    throw new ScoringError(
      "CONSECUTIVE_OVER_BOWLER",
      "A bowler cannot bowl two consecutive overs",
    );
  }

  // ---- wicket validation -------------------------------------------------
  const isFreeHit = state.freeHitPending;
  const wicket = ev.wicket ?? null;
  if (wicket) {
    if (
      wicket.type === "RETIRED_HURT" ||
      wicket.type === "RETIRED_OUT" ||
      wicket.type === "TIMED_OUT"
    ) {
      throw new ScoringError(
        "RETIREMENT_VIA_DELIVERY",
        `${wicket.type} happens between deliveries — use a retirement event`,
      );
    }
    if (isFreeHit && !ALLOWED_ON_FREE_HIT.has(wicket.type)) {
      throw new ScoringError(
        "INVALID_DISMISSAL_ON_FREE_HIT",
        `${wicket.type} cannot dismiss a batter on a free hit`,
      );
    }
    if (extraType === "WIDE" && !ALLOWED_ON_WIDE.has(wicket.type)) {
      throw new ScoringError(
        "INVALID_DISMISSAL_ON_WIDE",
        `${wicket.type} is not possible on a wide`,
      );
    }
    if (extraType === "NO_BALL" && !ALLOWED_ON_NO_BALL.has(wicket.type)) {
      throw new ScoringError(
        "INVALID_DISMISSAL_ON_NO_BALL",
        `${wicket.type} is not possible on a no-ball`,
      );
    }
    if (
      wicket.dismissedPlayerId !== strikerId &&
      wicket.dismissedPlayerId !== nonStrikerId
    ) {
      throw new ScoringError(
        "BATTER_NOT_AT_CREASE",
        "Dismissed player is not at the crease",
      );
    }
    if (
      wicket.dismissedPlayerId === nonStrikerId &&
      !NON_STRIKER_DISMISSALS.has(wicket.type)
    ) {
      throw new ScoringError(
        "INVALID_INPUT",
        `${wicket.type} can only dismiss the striker`,
      );
    }
  }

  // ---- over.ball numbering (before counting this ball) -------------------
  const overNumber = Math.floor(state.legalBalls / ballsPerOver);
  const ballInOver = (state.legalBalls % ballsPerOver) + 1;
  const overBall = `${overNumber}.${ballInOver}`;

  // ---- runs ---------------------------------------------------------------
  state.totalRuns += runsOffBat + extraRuns;

  const striker = ensureBatter(state, strikerId);
  striker.runs += runsOffBat;
  if (extraType !== "WIDE") striker.ballsFaced += 1; // no-balls count as faced
  const batBoundary = ev.batRunsAreBoundary ?? (runsOffBat === 4 || runsOffBat === 6);
  if (batBoundary && runsOffBat === 4) striker.fours += 1;
  if (batBoundary && runsOffBat === 6) striker.sixes += 1;

  switch (extraType) {
    case "WIDE":
      state.extras.wides += extraRuns;
      break;
    case "NO_BALL":
      state.extras.noBalls += extraRuns;
      break;
    case "BYE":
      state.extras.byes += extraRuns;
      break;
    case "LEG_BYE":
      state.extras.legByes += extraRuns;
      break;
  }

  // Bowler charged: bat runs + wide/no-ball extras; NOT byes/leg-byes.
  const bowler = ensureBowler(state, ev.bowlerId);
  const runsCharged =
    runsOffBat +
    (extraType === "WIDE" || extraType === "NO_BALL" ? extraRuns : 0);
  bowler.runsConceded += runsCharged;
  if (isLegal) bowler.legalBalls += 1;
  if (extraType === "WIDE") bowler.wides += 1;
  if (extraType === "NO_BALL") bowler.noBalls += 1;

  if (isLegal) state.legalBalls += 1;
  if (!state.currentOver.bowlerIds.includes(ev.bowlerId)) {
    state.currentOver.bowlerIds.push(ev.bowlerId);
  }
  state.currentOver.runsCharged += runsCharged;

  // ---- TOGGLE A: odd physical runs ran ------------------------------------
  // Boundaries are not run; the 1-run penalty for a wide/no-ball is not run.
  const batRunsRan = batBoundary ? 0 : runsOffBat;
  let extraRunsRan = 0;
  if (extraType === "WIDE" || extraType === "NO_BALL") {
    extraRunsRan = ev.extrasAreBoundary ? 0 : Math.max(extraRuns - 1, 0);
  } else if (extraType === "BYE" || extraType === "LEG_BYE") {
    extraRunsRan = ev.extrasAreBoundary ? 0 : extraRuns;
  }
  const runsRan = batRunsRan + extraRunsRan;
  if (runsRan % 2 === 1) swapEnds(state);

  // ---- wicket -------------------------------------------------------------
  let processedWicket: ProcessedDelivery["wicket"] = null;
  let replacementMissing = false;
  if (wicket) {
    // Crossing on the attempted run is one more positional exchange.
    if (wicket.battersCrossed) swapEnds(state);

    const dismissed = ensureBatter(state, wicket.dismissedPlayerId);
    const bowlerCredited =
      wicket.bowlerCredited ?? BOWLER_CREDITED_TYPES.has(wicket.type);
    dismissed.status = "OUT";
    dismissed.dismissal = {
      type: wicket.type,
      bowlerId: bowlerCredited ? ev.bowlerId : null,
      fielderId: wicket.fielderId ?? null,
    };
    if (bowlerCredited) bowler.wickets += 1;
    state.wickets += 1;

    // The dismissed batter's modeled position IS the end where the wicket
    // fell; the new batter enters there (backend-spec §3.7).
    const endWhereOut: CreaseEnd =
      state.strikerId === wicket.dismissedPlayerId
        ? "STRIKER_END"
        : "NON_STRIKER_END";

    state.fallOfWickets.push({
      wicketNumber: state.wickets,
      scoreAtFall: state.totalRuns,
      overBall,
      dismissedPlayerId: wicket.dismissedPlayerId,
      type: wicket.type,
      bowlerId: bowlerCredited ? ev.bowlerId : null,
      fielderId: wicket.fielderId ?? null,
      endWhereOut,
    });
    processedWicket = { ...wicket, endWhereOut };

    const maxWickets = state.config.battersPerSide - 1;
    if (state.wickets < maxWickets) {
      if (ev.newBatterId) {
        admitBatter(state, ev.newBatterId, endWhereOut);
      } else {
        replacementMissing = true; // nobody left to bat — all out
        vacateEnd(state, endWhereOut);
      }
    } else {
      vacateEnd(state, endWhereOut);
    }
  }

  // ---- TOGGLE B: end of over (independent of toggle A) --------------------
  const overCompleted = isLegal && state.legalBalls % ballsPerOver === 0;
  if (overCompleted) {
    swapEnds(state);
    if (
      state.currentOver.runsCharged === 0 &&
      state.currentOver.bowlerIds.length === 1
    ) {
      bowler.maidens += 1;
    }
    state.lastOverBowlerId = ev.bowlerId;
    state.currentOver = { bowlerIds: [], runsCharged: 0 };
  }

  // ---- free hit -----------------------------------------------------------
  if (extraType === "NO_BALL") {
    state.freeHitPending = true; // a no-ball (re-)arms the free hit
  } else if (extraType === "WIDE") {
    state.freeHitPending = isFreeHit; // an un-faced free hit carries forward
  } else {
    state.freeHitPending = false; // a legal ball consumes it
  }

  // ---- record the ball ----------------------------------------------------
  state.deliveries.push({
    sequence: state.deliveries.length + 1,
    overNumber,
    ballInOver,
    overBall,
    bowlerId: ev.bowlerId,
    strikerId,
    nonStrikerId,
    runsOffBat,
    extraType,
    extraRuns,
    isLegal,
    isFreeHit,
    wicket: processedWicket,
    totalAfter: state.totalRuns,
    wicketsAfter: state.wickets,
    commentary: ev.commentary,
  });

  // ---- innings end (backend-spec §3.8, in priority order) -----------------
  const { target, oversLimit, battersPerSide } = state.config;
  if (target != null && state.totalRuns >= target) {
    // Chase wins immediately — even mid-over.
    closeInnings(state, "TARGET_REACHED");
  } else if (state.wickets >= battersPerSide - 1 || replacementMissing) {
    closeInnings(state, "ALL_OUT");
  } else if (state.legalBalls >= oversLimit * ballsPerOver) {
    closeInnings(state, "OVERS_COMPLETE");
  }
}

function vacateEnd(state: InningsState, end: CreaseEnd): void {
  if (end === "STRIKER_END") state.strikerId = null;
  else state.nonStrikerId = null;
}

function admitBatter(
  state: InningsState,
  playerId: string,
  end: CreaseEnd,
): void {
  if (playerId === state.strikerId || playerId === state.nonStrikerId) {
    throw new ScoringError(
      "BATTER_ALREADY_AT_CREASE",
      "Incoming batter is already at the crease",
    );
  }
  const existing = state.batters[playerId];
  if (existing && (existing.status === "OUT" || existing.status === "RETIRED_OUT")) {
    throw new ScoringError(
      "BATTER_ALREADY_OUT",
      "Incoming batter has already been dismissed",
    );
  }
  if (
    state.config.battingOrder &&
    !state.config.battingOrder.includes(playerId)
  ) {
    throw new ScoringError(
      "BATTER_NOT_IN_XI",
      "Incoming batter is not in the playing XI",
    );
  }
  const batter = ensureBatter(state, playerId);
  batter.status = "NOT_OUT"; // a returning RETIRED_HURT batter resumes
  if (!state.battingOrderUsed.includes(playerId)) {
    state.battingOrderUsed.push(playerId);
  }
  if (end === "STRIKER_END") state.strikerId = playerId;
  else state.nonStrikerId = playerId;
}

function applyPenalty(state: InningsState, ev: PenaltyEvent): void {
  assertOpen(state);
  if (!Number.isInteger(ev.runs) || ev.runs <= 0) {
    throw new ScoringError("INVALID_INPUT", `Invalid penalty runs: ${ev.runs}`);
  }
  // No delivery involved: no ball count, no strike rotation, no bowler charge.
  state.totalRuns += ev.runs;
  state.extras.penalties += ev.runs;

  const { target } = state.config;
  if (target != null && state.totalRuns >= target) {
    closeInnings(state, "TARGET_REACHED");
  }
}

function applyRetirement(state: InningsState, ev: RetirementEvent): void {
  assertOpen(state);
  const { playerId } = ev;
  if (playerId !== state.strikerId && playerId !== state.nonStrikerId) {
    throw new ScoringError(
      "BATTER_NOT_AT_CREASE",
      "Retiring player is not at the crease",
    );
  }
  const batter = ensureBatter(state, playerId);
  const end: CreaseEnd =
    state.strikerId === playerId ? "STRIKER_END" : "NON_STRIKER_END";

  if (ev.type === "RETIRED_OUT") {
    // Counts as a dismissal — no bowler credit (backend-spec §3.5).
    batter.status = "RETIRED_OUT";
    batter.dismissal = { type: "RETIRED_OUT", bowlerId: null, fielderId: null };
    state.wickets += 1;
    state.fallOfWickets.push({
      wicketNumber: state.wickets,
      scoreAtFall: state.totalRuns,
      overBall: oversDisplay(state.legalBalls, state.config.ballsPerOver),
      dismissedPlayerId: playerId,
      type: "RETIRED_OUT",
      bowlerId: null,
      fielderId: null,
      endWhereOut: end,
    });
  } else {
    // RETIRED_HURT is NOT a dismissal — the batter may resume later.
    batter.status = "RETIRED_HURT";
  }

  const maxWickets = state.config.battersPerSide - 1;
  if (state.wickets >= maxWickets) {
    vacateEnd(state, end);
    closeInnings(state, "ALL_OUT");
    return;
  }
  if (ev.newBatterId) {
    vacateEnd(state, end);
    admitBatter(state, ev.newBatterId, end);
  } else {
    vacateEnd(state, end);
    closeInnings(state, "ALL_OUT"); // nobody available to replace
  }
}

function closeInnings(
  state: InningsState,
  reason: NonNullable<InningsState["closeReason"]>,
): void {
  state.status = "COMPLETED";
  state.closeReason = reason;
}

// ----------------------------------------------------------------
// Derived live view (→ ScoreSnapshot payload in Phase 2)
// ----------------------------------------------------------------

export function ballLabel(d: ProcessedDelivery): string {
  if (d.wicket) return "W";
  // A wide is always at least 1 run; show the total when more ran/boundary.
  if (d.extraType === "WIDE") return d.extraRuns > 1 ? `WD${d.extraRuns}` : "WD";
  // A no-ball is always +1 extra; show the total when the bat also scored.
  if (d.extraType === "NO_BALL") {
    const total = d.runsOffBat + d.extraRuns;
    return total > 1 ? `NB${total}` : "NB";
  }
  if (d.extraType === "BYE" || d.extraType === "LEG_BYE") {
    return String(d.extraRuns);
  }
  return String(d.runsOffBat);
}

export function getInningsSummary(state: InningsState): InningsSummary {
  const { ballsPerOver, oversLimit, target } = state.config;
  const totalBalls = oversLimit * ballsPerOver;
  const ballsRemaining =
    target != null ? Math.max(totalBalls - state.legalBalls, 0) : null;
  const runsNeeded =
    target != null ? Math.max(target - state.totalRuns, 0) : null;
  const last = state.deliveries[state.deliveries.length - 1];

  return {
    totalRuns: state.totalRuns,
    wickets: state.wickets,
    legalBalls: state.legalBalls,
    oversDisplay: oversDisplay(state.legalBalls, ballsPerOver),
    currentRunRate: currentRunRate(state.totalRuns, state.legalBalls, ballsPerOver),
    target: target ?? null,
    runsNeeded,
    ballsRemaining,
    requiredRunRate:
      runsNeeded != null && ballsRemaining != null
        ? requiredRunRate(runsNeeded, ballsRemaining, ballsPerOver)
        : null,
    strikerId: state.strikerId,
    nonStrikerId: state.nonStrikerId,
    currentBowlerId: last?.bowlerId ?? null,
    freeHitPending: state.freeHitPending,
    status: state.status,
    closeReason: state.closeReason,
    lastBalls: state.deliveries
      .slice(-6)
      .map((d) => ({ overBall: d.overBall, label: ballLabel(d) })),
  };
}
