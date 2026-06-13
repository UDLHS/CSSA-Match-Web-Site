"use server";

import { prisma } from "@/lib/db";
import { settingsUpdateSchema } from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import {
  requireRole,
  MASTER_DATA_ROLES,
  SUPER_ADMIN_ONLY,
} from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { rebuildSeasonStats } from "@/server/scoring/leaderboard";
import {
  revalidatePublic,
  PUBLIC_LEADERBOARD,
  PUBLIC_POPULAR,
  PUBLIC_HOME,
} from "@/server/revalidate";

/** The admin "rebuild engine" button — recomputes career stats + snapshots. */
export async function rebuildLeaderboards(
  raw: unknown,
): Promise<ActionResult<{ players: number; ballsProcessed: number }>> {
  return runAction(async () => {
    const seasonId = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const result = await prisma.$transaction(
      async (tx) => {
        const out = await rebuildSeasonStats(
          tx,
          seasonId,
          `manual:${actor.userId}`,
        );
        await writeAudit(tx, {
          userId: actor.userId,
          action: "leaderboard.rebuild",
          entityType: "Season",
          entityId: seasonId,
          after: out,
        });
        return out;
      },
      { timeout: 60000, maxWait: 10000 },
    );
    revalidatePublic(PUBLIC_LEADERBOARD, PUBLIC_POPULAR, PUBLIC_HOME);
    return result;
  });
}

/** Tournament settings — SUPER_ADMIN only (includes the points weights). */
export async function updateTournamentSettings(
  raw: unknown,
): Promise<ActionResult<{ seasonId: string }>> {
  return runAction(async () => {
    const { seasonId, ...data } = settingsUpdateSchema.parse(raw);
    const actor = await requireRole(SUPER_ADMIN_ONLY);

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { settings: true },
    });
    if (!season) throw new ActionError("NOT_FOUND", "Season not found");

    await prisma.$transaction(async (tx) => {
      await tx.tournamentSettings.upsert({
        where: { seasonId },
        create: { seasonId, ...data },
        update: data,
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "settings.update",
        entityType: "TournamentSettings",
        entityId: seasonId,
        before: season.settings,
        after: data,
      });
    });
    return { seasonId };
  });
}
