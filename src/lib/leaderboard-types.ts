/**
 * Client-safe shapes of the frozen LeaderboardSnapshot payloads
 * (built in src/server/scoring/leaderboard.ts — keep in sync).
 */

export interface LbTeamRef {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
}

export interface LbPlayerHead {
  rank: number;
  playerId: string;
  name: string;
  photoUrl: string | null;
  role: string;
  team: LbTeamRef | null;
  matches: number;
}

export interface LbBattingRow extends LbPlayerHead {
  runs: number;
  balls: number;
  strikeRate: number | null;
  average: number | null;
  fours: number;
  sixes: number;
  highest: string;
}

export interface LbBowlingRow extends LbPlayerHead {
  overs: string;
  balls: number;
  runsConceded: number;
  wickets: number;
  economy: number | null;
  average: number | null;
  strikeRate: number | null;
  best: string | null;
}

export interface LbOverallRow extends LbPlayerHead {
  battingPoints: number;
  bowlingPoints: number;
  fieldingPoints: number;
  totalPoints: number;
  playerOfMatchCount: number;
}

export interface PopularRow {
  rank: number;
  playerId: string;
  name: string;
  photoUrl: string | null;
  role: string;
  team: LbTeamRef | null;
  votes: number;
}
