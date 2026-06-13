import type { LbTeamRef } from "./leaderboard-types";

/** Player profile DTO — contract for the player modal (/api/players/[id]). */

export interface PlayerSeasonStats {
  matches: number;
  runs: number;
  ballsFaced: number;
  strikeRate: string;
  average: string;
  fours: number;
  sixes: number;
  highest: string;
  fifties: number;
  hundreds: number;
  legalBallsBowled: number;
  oversBowled: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: string;
  bowlingAverage: string;
  bowlingStrikeRate: string;
  best: string | null;
  catches: number;
  stumpings: number;
  runOuts: number;
  totalPoints: number;
}

export interface PlayerRecentMatch {
  matchId: string;
  label: string; // "vs SES · Jun 8"
  batting: string | null; // "34 (28)"
  bowling: string | null; // "2/24 (4.0)"
  resultText: string | null;
}

export interface PlayerProfileDTO {
  playerId: string;
  name: string;
  photoUrl: string | null;
  role: string;
  roleLabel: string;
  battingStyleLabel: string;
  bowlingStyleLabel: string | null;
  jerseyNumber: number | null;
  isCaptain: boolean;
  bio: string | null;
  team: LbTeamRef | null;
  votes: number | null;
  playerOfMatchCount: number;
  stats: PlayerSeasonStats | null;
  recentMatches: PlayerRecentMatch[];
}

export const ROLE_LABELS: Record<string, string> = {
  BATTER: "Batter",
  BOWLER: "Bowler",
  ALL_ROUNDER: "All-rounder",
  WICKET_KEEPER: "Wicket-keeper",
};

export const BATTING_STYLE_LABELS: Record<string, string> = {
  RIGHT_HAND: "Right-hand bat",
  LEFT_HAND: "Left-hand bat",
};

export const BOWLING_STYLE_LABELS: Record<string, string> = {
  RIGHT_ARM_FAST: "Right-arm fast",
  RIGHT_ARM_MEDIUM: "Right-arm medium",
  RIGHT_ARM_OFF_SPIN: "Off-spin",
  RIGHT_ARM_LEG_SPIN: "Leg-spin",
  LEFT_ARM_FAST: "Left-arm fast",
  LEFT_ARM_MEDIUM: "Left-arm medium",
  LEFT_ARM_ORTHODOX: "Left-arm orthodox",
  LEFT_ARM_WRIST_SPIN: "Left-arm wrist spin",
  NONE: "",
};
