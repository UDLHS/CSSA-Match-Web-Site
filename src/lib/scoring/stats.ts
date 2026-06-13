/**
 * Stat formulas & guards (backend-spec §3 base calculations + §3.9).
 * Every divide-by-zero case returns null — formatters decide how to render.
 */

/** 17 legal balls → "2.5" (floor(legalBalls/6).remainder). */
export function oversDisplay(legalBalls: number, ballsPerOver = 6): string {
  const overs = Math.floor(legalBalls / ballsPerOver);
  const balls = legalBalls % ballsPerOver;
  return balls === 0 ? `${overs}.0` : `${overs}.${balls}`;
}

/** Decimal overs for rate math: 17 balls → 17/6, NOT 2.5. */
export function oversAsDecimal(legalBalls: number, ballsPerOver = 6): number {
  return legalBalls / ballsPerOver;
}

/** Target = innings-1 total + 1. */
export function chaseTarget(firstInningsTotal: number): number {
  return firstInningsTotal + 1;
}

/** CRR = runs / overs faced. Null before the first legal ball. */
export function currentRunRate(
  runs: number,
  legalBalls: number,
  ballsPerOver = 6,
): number | null {
  if (legalBalls <= 0) return null;
  return runs / oversAsDecimal(legalBalls, ballsPerOver);
}

/** RRR = runs needed / overs remaining. Null when no balls remain. */
export function requiredRunRate(
  runsNeeded: number,
  ballsRemaining: number,
  ballsPerOver = 6,
): number | null {
  if (ballsRemaining <= 0) return null;
  return runsNeeded / oversAsDecimal(ballsRemaining, ballsPerOver);
}

/** SR = runs / balls × 100. Null with zero balls faced. */
export function strikeRate(runs: number, balls: number): number | null {
  if (balls <= 0) return null;
  return (runs / balls) * 100;
}

/** Batting average = runs / dismissals. Null when never dismissed. */
export function battingAverage(
  runs: number,
  dismissals: number,
): number | null {
  if (dismissals <= 0) return null;
  return runs / dismissals;
}

/** Economy = runs conceded / overs bowled. Null with zero legal balls. */
export function economyRate(
  runsConceded: number,
  legalBalls: number,
  ballsPerOver = 6,
): number | null {
  if (legalBalls <= 0) return null;
  return runsConceded / oversAsDecimal(legalBalls, ballsPerOver);
}

/** Bowling average = runs conceded / wickets. Null with zero wickets. */
export function bowlingAverage(
  runsConceded: number,
  wickets: number,
): number | null {
  if (wickets <= 0) return null;
  return runsConceded / wickets;
}

/** Bowling SR = legal balls / wickets. Null with zero wickets. */
export function bowlingStrikeRate(
  legalBalls: number,
  wickets: number,
): number | null {
  if (wickets <= 0) return null;
  return legalBalls / wickets;
}

// ----------------------------------------------------------------
// Best bowling / highest score orderings (§3.9)
// ----------------------------------------------------------------

export interface BowlingFigures {
  wickets: number;
  runsConceded: number;
}

/**
 * Best bowling: more wickets first, fewer runs as tiebreak.
 * Returns <0 when `a` is better (sort ascending = best first).
 */
export function compareBestBowling(
  a: BowlingFigures,
  b: BowlingFigures,
): number {
  if (a.wickets !== b.wickets) return b.wickets - a.wickets;
  return a.runsConceded - b.runsConceded;
}

export function formatBowlingFigures(f: BowlingFigures): string {
  return `${f.wickets}/${f.runsConceded}`;
}

export interface HighScore {
  runs: number;
  notOut: boolean;
}

/**
 * Highest score tracks the not-out flag: 50* beats 50.
 * Returns <0 when `a` is better.
 */
export function compareHighestScore(a: HighScore, b: HighScore): number {
  if (a.runs !== b.runs) return b.runs - a.runs;
  return Number(b.notOut) - Number(a.notOut);
}

export function formatHighScore(h: HighScore): string {
  return h.notOut ? `${h.runs}*` : `${h.runs}`;
}

// ----------------------------------------------------------------
// Overall leaderboard points — ONE config object an admin can tweak
// (backend-spec §2C). Stored per season in TournamentSettings.pointsConfig.
// ----------------------------------------------------------------

export interface PointsConfig {
  batting: {
    perRun: number;
    perFour: number;
    perSix: number;
    perFifty: number; // milestone bonus at 50–99
    perHundred: number; // milestone bonus at 100+
  };
  bowling: {
    perWicket: number;
    perRunConceded: number; // negative weight
    perMaiden: number;
    /** Bonus when economy is at or below the threshold (min 2 overs bowled). */
    economyBonus: { atOrBelow: number; points: number };
  };
  fielding: {
    perCatch: number;
    perStumping: number;
    perDirectHitRunOut: number;
    perAssistedRunOut: number;
  };
}

export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  batting: { perRun: 1, perFour: 2, perSix: 4, perFifty: 10, perHundred: 25 },
  bowling: {
    perWicket: 20,
    perRunConceded: -1,
    perMaiden: 5,
    economyBonus: { atOrBelow: 6, points: 10 },
  },
  fielding: {
    perCatch: 8,
    perStumping: 10,
    perDirectHitRunOut: 10,
    perAssistedRunOut: 6,
  },
};

export interface OverallStatsInput {
  runs: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  wickets: number;
  runsConceded: number;
  legalBallsBowled: number;
  maidens: number;
  catches: number;
  stumpings: number;
  directHitRunOuts: number;
  assistedRunOuts: number;
}

export interface OverallPoints {
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
}

export function computeOverallPoints(
  s: OverallStatsInput,
  config: PointsConfig = DEFAULT_POINTS_CONFIG,
  ballsPerOver = 6,
): OverallPoints {
  const battingPoints =
    s.runs * config.batting.perRun +
    s.fours * config.batting.perFour +
    s.sixes * config.batting.perSix +
    s.fifties * config.batting.perFifty +
    s.hundreds * config.batting.perHundred;

  let bowlingPoints =
    s.wickets * config.bowling.perWicket +
    s.runsConceded * config.bowling.perRunConceded +
    s.maidens * config.bowling.perMaiden;
  const economy = economyRate(s.runsConceded, s.legalBallsBowled, ballsPerOver);
  if (
    economy !== null &&
    s.legalBallsBowled >= 2 * ballsPerOver &&
    economy <= config.bowling.economyBonus.atOrBelow
  ) {
    bowlingPoints += config.bowling.economyBonus.points;
  }

  const fieldingPoints =
    s.catches * config.fielding.perCatch +
    s.stumpings * config.fielding.perStumping +
    s.directHitRunOuts * config.fielding.perDirectHitRunOut +
    s.assistedRunOuts * config.fielding.perAssistedRunOut;

  return {
    battingPoints,
    bowlingPoints,
    fieldingPoints,
    totalPoints: battingPoints + bowlingPoints + fieldingPoints,
  };
}
