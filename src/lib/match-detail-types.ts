/**
 * Match detail DTO — the contract between the server builder
 * (src/server/queries/match-detail.ts) and the public detail view.
 * Everything is JSON-serializable; client imports types only.
 */

export interface DetailTeam {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export interface DetailBattingRow {
  playerId: string;
  name: string;
  photoUrl: string | null;
  /** "c Silva b Madushanka" · "not out" · "did not bat" */
  how: string;
  notOut: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
}

export interface DetailBowlingRow {
  playerId: string;
  name: string;
  photoUrl: string | null;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

export interface DetailFowRow {
  wicketNumber: number;
  scoreText: string; // "42/1"
  overBall: string; // "5.2"
  playerOut: string;
  typeLabel: string; // "Caught"
  bowler: string | null;
  fielder: string | null;
}

export interface DetailBall {
  overBall: string;
  label: string; // "0".."6" | "W" | "WD" | "NB"
  text: string;
}

export interface DetailOver {
  over: number; // 1-based display number
  balls: DetailBall[]; // newest first within the over
  runs: number;
}

export interface DetailInnings {
  inningsNumber: number;
  battingTeam: DetailTeam;
  bowlingTeam: DetailTeam;
  runs: number;
  wickets: number;
  oversDisplay: string;
  runRate: string;
  target: number | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalties: number;
    total: number;
  };
  batting: DetailBattingRow[];
  bowling: DetailBowlingRow[];
  fow: DetailFowRow[];
  overs: DetailOver[]; // newest over first
}

export interface DetailXIEntry {
  playerId: string;
  name: string;
  battingOrder: number;
  isKeeper: boolean;
}

export interface MatchDetailDTO {
  matchId: string;
  matchNumber: number;
  stage: string | null;
  format: string;
  status: "DRAFT" | "UPCOMING" | "LIVE" | "INNINGS_BREAK" | "COMPLETED" | "ABANDONED";
  scheduledAt: string;
  venue: { name: string; location: string } | null;
  teams: { home: DetailTeam | null; away: DetailTeam | null };
  tossText: string | null;
  /** Live need-line or final result, e.g. "CN Falcons need 88 off 48 balls". */
  statusLine: string | null;
  resultText: string | null;
  playerOfMatch: { id: string; name: string } | null;
  topScorer: { name: string; line: string } | null;
  bestBowler: { name: string; line: string } | null;
  lastBalls: { overBall: string; label: string }[];
  umpires: string[];
  notes: string | null;
  innings: DetailInnings[];
  playingXI: { team: DetailTeam; players: DetailXIEntry[] }[];
}
