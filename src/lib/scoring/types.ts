/**
 * Scoring engine domain types — pure TypeScript, no UI / no DB.
 * These mirror the Prisma enums so engine output maps 1:1 onto rows.
 */

export type ExtraType = "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE" | "PENALTY";

export type WicketType =
  | "BOWLED"
  | "CAUGHT"
  | "CAUGHT_AND_BOWLED"
  | "LBW"
  | "RUN_OUT"
  | "STUMPED"
  | "HIT_WICKET"
  | "RETIRED_HURT"
  | "RETIRED_OUT"
  | "OBSTRUCTING_FIELD"
  | "HIT_BALL_TWICE"
  | "TIMED_OUT"
  | "OTHER";

export type CreaseEnd = "STRIKER_END" | "NON_STRIKER_END";

export type InningsCloseReason =
  | "ALL_OUT"
  | "OVERS_COMPLETE"
  | "TARGET_REACHED"
  | "DECLARED"
  | "MANUAL";

/** Dismissals credited to the bowler. */
export const BOWLER_CREDITED_TYPES: ReadonlySet<WicketType> = new Set([
  "BOWLED",
  "CAUGHT",
  "CAUGHT_AND_BOWLED",
  "LBW",
  "STUMPED",
  "HIT_WICKET",
]);

/** Dismissals that can occur on a WIDE (ball not hit by the bat). */
export const ALLOWED_ON_WIDE: ReadonlySet<WicketType> = new Set([
  "RUN_OUT",
  "STUMPED",
  "HIT_WICKET",
  "OBSTRUCTING_FIELD",
  "OTHER",
]);

/** Dismissals that can occur on a NO-BALL (no stumping off a no-ball). */
export const ALLOWED_ON_NO_BALL: ReadonlySet<WicketType> = new Set([
  "RUN_OUT",
  "OBSTRUCTING_FIELD",
  "HIT_BALL_TWICE",
  "OTHER",
]);

/**
 * Dismissals possible on a FREE HIT (backend-spec §3.2: run-out / obstructing /
 * handled-the-ball — the latter folded into obstructing + hit-ball-twice in
 * the modern Laws).
 */
export const ALLOWED_ON_FREE_HIT: ReadonlySet<WicketType> = new Set([
  "RUN_OUT",
  "OBSTRUCTING_FIELD",
  "HIT_BALL_TWICE",
]);

// ----------------------------------------------------------------
// Events (the per-innings ordered stream — what gets replayed)
// ----------------------------------------------------------------

export interface WicketInput {
  type: WicketType;
  /** Striker or non-striker (run-outs can dismiss either). */
  dismissedPlayerId: string;
  /** Defaults from `type` (BOWLER_CREDITED_TYPES) when omitted. */
  bowlerCredited?: boolean;
  /** Catcher / stumper / direct-hit thrower. */
  fielderId?: string;
  /** Thrower or keeper on assisted run-outs. */
  assistFielderId?: string;
  directHit?: boolean;
  /**
   * Run-outs: batters crossed on the attempted (incomplete) run.
   * Combined with completed runs, this resolves who the next striker is and
   * which end the new batter enters at (backend-spec §3.7).
   */
  battersCrossed?: boolean;
  notes?: string;
}

export interface DeliveryEvent {
  kind: "delivery";
  bowlerId: string;
  /** Runs scored off the bat (0 on a wide). */
  runsOffBat: number;
  /** WIDE | NO_BALL | BYE | LEG_BYE. PENALTY uses a separate `penalty` event. */
  extraType?: Exclude<ExtraType, "PENALTY"> | null;
  /** Total extra runs INCLUDING the automatic 1 for WIDE / NO_BALL. */
  extraRuns?: number;
  /**
   * Runs off the bat reached the boundary (default: true when runsOffBat is
   * 4 or 6). Boundaries don't change ends; an all-run 4 does.
   */
  batRunsAreBoundary?: boolean;
  /** Extras beyond the penalty reached the boundary (e.g. 5 wides). */
  extrasAreBoundary?: boolean;
  wicket?: WicketInput | null;
  /** Replacement batter when a wicket vacates an end. Omit → innings closes ALL_OUT. */
  newBatterId?: string | null;
  commentary?: string;
}

/** Penalty runs may exist WITHOUT an associated delivery (backend-spec §3.6). */
export interface PenaltyEvent {
  kind: "penalty";
  runs: number;
  reason?: string;
}

/** Retirement happens between deliveries (ball is dead). */
export interface RetirementEvent {
  kind: "retirement";
  playerId: string;
  /** RETIRED_HURT is NOT a dismissal; RETIRED_OUT is. */
  type: "RETIRED_HURT" | "RETIRED_OUT";
  /** Replacement (may be a returning RETIRED_HURT batter). Omit → ALL_OUT. */
  newBatterId?: string | null;
  notes?: string;
}

/** Admin correction: swap which batter is on strike. */
export interface SwapEndsEvent {
  kind: "swapEnds";
}

export type InningsEvent =
  | DeliveryEvent
  | PenaltyEvent
  | RetirementEvent
  | SwapEndsEvent;

// ----------------------------------------------------------------
// Config & state
// ----------------------------------------------------------------

export interface InningsConfig {
  inningsNumber: number;
  oversLimit: number;
  ballsPerOver: number;
  /** Players per side; all out at battersPerSide - 1 wickets. */
  battersPerSide: number;
  /** Innings 2 only: innings-1 total + 1. */
  target?: number | null;
  openingStrikerId: string;
  openingNonStrikerId: string;
  /** Optional XI — when provided, incoming batters are validated against it. */
  battingOrder?: string[];
}

export type BatterStatus = "NOT_OUT" | "OUT" | "RETIRED_HURT" | "RETIRED_OUT";

export interface BatterState {
  playerId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  status: BatterStatus;
  dismissal: {
    type: WicketType;
    bowlerId: string | null;
    fielderId: string | null;
  } | null;
}

export interface BowlerState {
  playerId: string;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalties: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  scoreAtFall: number;
  overBall: string; // "12.4"
  dismissedPlayerId: string;
  type: WicketType;
  bowlerId: string | null;
  fielderId: string | null;
  endWhereOut: CreaseEnd;
}

/** A processed ball — engine output, persisted as a Delivery row. */
export interface ProcessedDelivery {
  sequence: number;
  overNumber: number; // completed overs before this ball (0-based)
  ballInOver: number; // 1..ballsPerOver; illegal balls repeat the number
  overBall: string; // "16.3"
  bowlerId: string;
  strikerId: string; // at ball start
  nonStrikerId: string; // at ball start
  runsOffBat: number;
  extraType: Exclude<ExtraType, "PENALTY"> | null;
  extraRuns: number;
  isLegal: boolean;
  isFreeHit: boolean;
  wicket: (WicketInput & { endWhereOut: CreaseEnd }) | null;
  totalAfter: number;
  wicketsAfter: number;
  commentary?: string;
}

export interface InningsState {
  config: InningsConfig;
  status: "IN_PROGRESS" | "COMPLETED";
  closeReason: InningsCloseReason | null;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  extras: ExtrasBreakdown;
  batters: Record<string, BatterState>;
  bowlers: Record<string, BowlerState>;
  /** Order batters came to the crease. */
  battingOrderUsed: string[];
  strikerId: string | null;
  nonStrikerId: string | null;
  /** The NEXT delivery is a free hit. */
  freeHitPending: boolean;
  /** Bowler of the final ball of the previous over (consecutive-over guard). */
  lastOverBowlerId: string | null;
  fallOfWickets: FallOfWicket[];
  deliveries: ProcessedDelivery[];
  /** Events processed so far (replay cursor). */
  eventCount: number;
  /** Per-over tracking for maidens. */
  currentOver: { bowlerIds: string[]; runsCharged: number };
}

/** Derived live view — becomes the ScoreSnapshot payload in Phase 2. */
export interface InningsSummary {
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  oversDisplay: string;
  currentRunRate: number | null;
  target: number | null;
  runsNeeded: number | null;
  ballsRemaining: number | null;
  requiredRunRate: number | null;
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  freeHitPending: boolean;
  status: "IN_PROGRESS" | "COMPLETED";
  closeReason: InningsCloseReason | null;
  lastBalls: { overBall: string; label: string }[];
}
