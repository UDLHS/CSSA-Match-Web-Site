import type { StandingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Team points table. The manual half (points / NRR / group / qualification)
 * lives in the `TeamStanding` row; the P/W/L/NR half is DERIVED here from
 * completed + abandoned matches, so it stays correct as results land without
 * any write-path coupling to the scoring engine.
 *
 * Display order inside a group: points desc, then NRR desc, then an optional
 * manual `sortHint`, then team name.
 */

export interface StandingRow {
  id: string; // TeamStanding id (admin edit/delete handle)
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
  points: number; // manual
  netRunRate: number; // manual
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
  const [standings, matches] = await Promise.all([
    prisma.teamStanding.findMany({
      where: { seasonId, team: { deletedAt: null } },
      include: { team: { select: TEAM_SELECT } },
    }),
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

  const rows: StandingRow[] = standings.map((s) => {
    const d = tally.get(s.teamId) ?? { played: 0, won: 0, lost: 0, noResult: 0 };
    return {
      id: s.id,
      teamId: s.teamId,
      team: s.team,
      groupName: s.groupName,
      played: d.played,
      won: d.won,
      lost: d.lost,
      noResult: d.noResult,
      points: s.points,
      netRunRate: s.netRunRate,
      status: s.status,
      sortHint: s.sortHint,
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
          b.netRunRate - a.netRunRate ||
          b.sortHint - a.sortHint ||
          a.team.name.localeCompare(b.team.name),
      ),
    }));

  return ordered;
}

/** Flat list for the admin editor (one row per stored standing). */
export async function listAdminStandings(seasonId: string): Promise<StandingRow[]> {
  const groups = await buildStandings(seasonId);
  return groups.flatMap((g) => g.rows);
}
