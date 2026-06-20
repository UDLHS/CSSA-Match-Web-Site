"use server";

import { prisma } from "@/lib/db";
import { requireRole, SUPER_ADMIN_ONLY } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { runAction, type ActionResult } from "@/server/result";
import {
  revalidatePublic,
  PUBLIC_HOME,
  PUBLIC_MATCHES,
  PUBLIC_LEADERBOARD,
  PUBLIC_SQUADS,
  PUBLIC_POPULAR,
} from "@/server/revalidate";

export interface TestDataCounts {
  teams: number;
  players: number;
  matches: number;
}

/**
 * Irreversibly wipes every match, team and player (and everything derived
 * from them — deliveries, stats, snapshots, standings, leaderboard
 * snapshots). Venues, sponsors, the season/tournament record and admin
 * accounts are untouched — they're real configuration, not test data.
 *
 * SUPER_ADMIN only, double-gated: the client requires typing a literal
 * confirmation phrase before this can even be called.
 *
 * Deletion order respects the schema's FK constraints — a Team/Player can't
 * be deleted while a Match still references it (`onDelete: Restrict` on
 * MatchTeam/PlayingXI/Innings/stats), so matches must go first. Deleting
 * Match cascades away everything under it; deleting Player then Team
 * cascades the rest (career stats, popular votes, team-history, standings).
 */
export async function wipeTestData(): Promise<ActionResult<TestDataCounts>> {
  return runAction(async () => {
    const actor = await requireRole(SUPER_ADMIN_ONLY);

    const counts = await prisma.$transaction(
      async (tx) => {
        const [teams, players, matches] = await Promise.all([
          tx.team.count(),
          tx.player.count(),
          tx.match.count(),
        ]);

        await tx.match.deleteMany({});
        await tx.leaderboardSnapshot.deleteMany({});
        await tx.player.deleteMany({});
        await tx.team.deleteMany({});

        await writeAudit(tx, {
          userId: actor.userId,
          action: "data.wipeTestData",
          entityType: "System",
          details: `Removed ${teams} teams, ${players} players, ${matches} matches and everything derived from them`,
        });

        return { teams, players, matches };
      },
      { timeout: 60000, maxWait: 10000 },
    );

    revalidatePublic(
      PUBLIC_HOME,
      PUBLIC_MATCHES,
      PUBLIC_LEADERBOARD,
      PUBLIC_SQUADS,
      PUBLIC_POPULAR,
    );

    return counts;
  });
}
