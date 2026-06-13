/** DTO contract for the live scoring console (server builder → client UI). */

export interface ConsoleTeam {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
}

export interface ConsoleBatter {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: string;
}

export interface ConsoleBowler {
  playerId: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
}

export interface ConsoleLastBall {
  sequence: number;
  overBall: string;
  label: string;
  text: string;
  isNonBall: boolean;
}

export interface ConsolePlayerOption {
  id: string;
  name: string;
  battingOrder?: number;
}

export interface ConsoleInnings {
  id: string;
  number: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  closeReason: string | null;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversDisplay: string;
  oversLimit: number;
  ballsPerOver: number;
  target: number | null;
  runsNeeded: number | null;
  ballsRemaining: number | null;
  crr: string;
  rrr: string;
  freeHitPending: boolean;
  nextSequence: number;
  /** True when the next legal ball begins a new over (bowler must be chosen). */
  atOverStart: boolean;
  lastOverBowlerId: string | null;
  striker: ConsoleBatter | null;
  nonStriker: ConsoleBatter | null;
  /** Bowler of the last delivery (used as current bowler mid-over). */
  currentBowlerId: string | null;
  currentBowler: ConsoleBowler | null;
  lastBalls: ConsoleLastBall[];
  /** Batting XI members not out and not currently at the crease. */
  availableBatters: ConsolePlayerOption[];
  /** Batters currently at the crease (for run-out dismissed-player picker). */
  atCrease: ConsolePlayerOption[];
  bowlingXI: ConsolePlayerOption[];
}

export interface ScoringStateDTO {
  matchId: string;
  matchNumber: number;
  format: string;
  matchStatus: "DRAFT" | "UPCOMING" | "LIVE" | "INNINGS_BREAK" | "COMPLETED" | "ABANDONED";
  playersPerSide: number;
  battingTeam: ConsoleTeam | null;
  bowlingTeam: ConsoleTeam | null;
  innings: ConsoleInnings | null;
  /** Set when the next step is to start an innings (no active innings). */
  startInnings: {
    nextNumber: number;
    /** Teams to choose batting side from (with their XI for opener pick). */
    options: { team: ConsoleTeam; xi: ConsolePlayerOption[] }[];
  } | null;
  /** Match can be completed now (at least one ball has been bowled). */
  canComplete: boolean;
  /** Match can be abandoned (it's in play). */
  canAbandon: boolean;
  /** All squad members per team (for Player-of-the-Match picker). */
  allPlayers: ConsolePlayerOption[];
}
