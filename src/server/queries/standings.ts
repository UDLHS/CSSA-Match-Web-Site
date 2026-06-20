import type { StandingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Team points table. Starts from every active team (not just configured
 * ones) so it never needs manual setup. Points/NRR are auto-computed by the
 * leaderboard engine on match completion (server/scoring/leaderboard.ts) and
 * read here from `TeamStanding.auto*`; an admin's `pointsOverride` /
 * `nrrOverride` — if set — wins over the auto value. P/W/L/NR are DERIVED
 * here from completed + abandoned matches, so they stay correct as results
 * land without any write-path coupling to the scoring engine. groupName /
 * status (Q/E badge) have no auto source and stay admin-only.
 *
 * Display order inside a group: points desc, then NRR desc, then an optional
 * manual `sortHint`, then team name.
 */

export interface StandingRow {
  /** TeamStanding row id — null when the team has no row yet (pure defaults). */
  id: string | null;
  teamId: string;
  team: {
    id: string;
    name: string;
    shortName: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  groupName: string;
  played: number; // derived
  won: number; // derived
  lost: number; // derived
  noResult: number; // derived
  points: number; // pointsOverride ?? autoPoints, defaults to 0
  netRunRate: number | null; // nrrOverride ?? autoNetRunRate, null = no overs yet
  pointsIsOverridden: boolean;
  nrrIsOverridden: boolean;
  autoPoints: number;
  autoNetRunRate: number | null;
  status: StandingStatus;
  sortHint: number;
}

export interface StandingGroup {
  groupName: string; // "" => single, ungrouped table
  rows: StandingRow[];
}

type Tally = { played: number; won: number; lost: number; noResult: number };

const TEAM_SELECT = {
  id: true,
  name: true,
  shortName: true,
  logoUrl: true,
  primaryColor: true,
} as const;

/** Build the grouped, sorted points table for a season. */
export async function buildStandings(seasonId: string): Promise<StandingGroup[]> {
  const [teams, standings, matches] = await Promise.all([
    prisma.team.findMany({ where: { deletedAt: null }, select: TEAM_SELECT }),
    prisma.teamStanding.findMany({ where: { seasonId } }),
    prisma.match.findMany({
      where: {
        seasonId,
        deletedAt: null,
        status: { in: ["COMPLETED", "ABANDONED"] },
      },
      select: {
        status: true,
        winnerTeamId: true,
        matchTeams: { select: { teamId: true } },
      },
    }),
  ]);

  // Tally W/L/NR per team from results that actually happened.
  const tally = new Map<string, Tally>();
  for (const m of matches) {
    for (const { teamId } of m.matchTeams) {
      const t = tally.get(teamId) ?? { played: 0, won: 0, lost: 0, noResult: 0 };
      t.played += 1;
      if (m.status === "ABANDONED" || !m.winnerTeamId) {
        t.noResult += 1; // abandoned or a no-result/tie
      } else if (m.winnerTeamId === teamId) {
        t.won += 1;
      } else {
        t.lost += 1;
      }
      tally.set(teamId, t);
    }
  }

  const standingByTeam = new Map(standings.map((s) => [s.teamId, s]));

  const rows: StandingRow[] = teams.map((team) => {
    const d = tally.get(team.id) ?? { played: 0, won: 0, lost: 0, noResult: 0 };
    const s = standingByTeam.get(team.id);
    const autoPoints = s?.autoPoints ?? 0;
    const autoNetRunRate = s?.autoNetRunRate ?? null;
    const pointsIsOverridden = s?.pointsOverride != null;
    const nrrIsOverridden = s?.nrrOverride != null;
    return {
      id: s?.id ?? null,
      teamId: team.id,
      team,
      groupName: s?.groupName ?? "",
      played: d.played,
      won: d.won,
      lost: d.lost,
      noResult: d.noResult,
      points: s?.pointsOverride ?? autoPoints,
      netRunRate: s?.nrrOverride ?? autoNetRunRate,
      pointsIsOverridden,
      nrrIsOverridden,
      autoPoints,
      autoNetRunRate,
      status: s?.status ?? "NONE",
      sortHint: s?.sortHint ?? 0,
    };
  });

  // Group by groupName, then rank inside each group.
  const groups = new Map<string, StandingRow[]>();
  for (const r of rows) {
    const g = groups.get(r.groupName) ?? [];
    g.push(r);
    groups.set(r.groupName, g);
  }

  const ordered = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, rs]) => ({
      groupName,
      rows: rs.sort(
        (a, b) =>
          b.points - a.points ||
          (b.netRunRate ?? 0) - (a.netRunRate ?? 0) ||
          b.sortHint - a.sortHint ||
          a.team.name.localeCompare(b.team.name),
      ),
    }));

  return ordered;
}

/** Flat list for the admin editor (one row per active team). */
export async function listAdminStandings(seasonId: string): Promise<StandingRow[]> {
  const groups = await buildStandings(seasonId);
  return groups.flatMap((g) => g.rows);
}
