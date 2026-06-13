"use server";

import { prisma } from "@/lib/db";
import { playerCreateSchema, playerUpdateSchema } from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { liveMatchIdsForTeam } from "@/server/scoring/persist";
import { refreshSnapshot } from "@/server/scoring/snapshot";
import type { Db } from "@/server/audit";
import {
  revalidatePublic,
  PUBLIC_SQUADS,
  PUBLIC_LEADERBOARD,
  PUBLIC_POPULAR,
} from "@/server/revalidate";

/** Public pages a player edit can change. */
function revalidatePlayerPages() {
  revalidatePublic(PUBLIC_SQUADS, PUBLIC_LEADERBOARD, PUBLIC_POPULAR);
}

/**
 * Keep captaincy single-source and exclusive: a team has at most one captain,
 * and `Team.captainId` always tracks the player flagged `isCaptain`.
 *  - marking a captain demotes any other captain on that team + sets captainId
 *  - clearing it (or moving the player) removes the stale captainId
 */
async function syncCaptaincy(
  tx: Db,
  playerId: string,
  teamId: string | null | undefined,
  isCaptain: boolean,
): Promise<void> {
  // Drop this player as captain from any team that isn't their current one.
  await tx.team.updateMany({
    where: teamId ? { captainId: playerId, id: { not: teamId } } : { captainId: playerId },
    data: { captainId: null },
  });
  if (isCaptain && teamId) {
    await tx.player.updateMany({
      where: { teamId, isCaptain: true, id: { not: playerId } },
      data: { isCaptain: false },
    });
    await tx.team.update({ where: { id: teamId }, data: { captainId: playerId } });
  } else if (teamId) {
    await tx.team.updateMany({
      where: { id: teamId, captainId: playerId },
      data: { captainId: null },
    });
  }
}

export async function createPlayer(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = playerCreateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const player = await prisma.$transaction(async (tx) => {
      const created = await tx.player.create({ data: input });
      // Team membership history starts at creation when a team is set.
      if (input.teamId) {
        await tx.playerTeamHistory.create({
          data: { playerId: created.id, teamId: input.teamId },
        });
      }
      await syncCaptaincy(tx, created.id, input.teamId, input.isCaptain ?? false);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "player.create",
        entityType: "Player",
        entityId: created.id,
        after: input,
      });
      return created;
    });
    revalidatePlayerPages();
    return { id: player.id };
  });
}

export async function updatePlayer(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { id, ...data } = playerUpdateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const before = await prisma.player.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ActionError("NOT_FOUND", "Player not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.player.update({ where: { id }, data });

      // Team move → close the open history row, open a new one.
      if (data.teamId !== undefined && data.teamId !== before.teamId) {
        await tx.playerTeamHistory.updateMany({
          where: { playerId: id, toDate: null },
          data: { toDate: new Date() },
        });
        if (data.teamId) {
          await tx.playerTeamHistory.create({
            data: { playerId: id, teamId: data.teamId },
          });
        }
      }

      // Keep captaincy exclusive + synced to the team (uses post-update values).
      const effTeamId = data.teamId !== undefined ? data.teamId : before.teamId;
      const effCaptain = data.isCaptain !== undefined ? data.isCaptain : before.isCaptain;
      await syncCaptaincy(tx, id, effTeamId, effCaptain);

      await writeAudit(tx, {
        userId: actor.userId,
        action: "player.update",
        entityType: "Player",
        entityId: id,
        before,
        after: data,
      });

      // Name/photo changes show up in live payloads (striker lines etc.).
      const teamIds = new Set(
        [before.teamId, data.teamId].filter((t): t is string => !!t),
      );
      const matchIds = new Set<string>();
      for (const teamId of teamIds) {
        for (const m of await liveMatchIdsForTeam(tx, teamId)) matchIds.add(m);
      }
      for (const matchId of matchIds) {
        await refreshSnapshot(tx, matchId);
      }
    });
    revalidatePlayerPages();
    return { id };
  });
}

export async function softDeletePlayer(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player || player.deletedAt) {
      throw new ActionError("NOT_FOUND", "Player not found");
    }
    const upcoming = await prisma.playingXI.count({
      where: {
        playerId: id,
        match: {
          deletedAt: null,
          status: { in: ["UPCOMING", "LIVE", "INNINGS_BREAK"] },
        },
      },
    });
    if (upcoming > 0) {
      throw new ActionError(
        "INVALID_STATE",
        "Player is in an upcoming or live XI — remove them from the XI first",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.playerTeamHistory.updateMany({
        where: { playerId: id, toDate: null },
        data: { toDate: new Date() },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "player.softDelete",
        entityType: "Player",
        entityId: id,
        before: player,
      });
    });
    revalidatePlayerPages();
    return { id };
  });
}

export async function restorePlayer(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const player = await prisma.player.findUnique({ where: { id } });
    if (!player || !player.deletedAt) {
      throw new ActionError("NOT_FOUND", "No deleted player with that id");
    }

    await prisma.$transaction(async (tx) => {
      await tx.player.update({ where: { id }, data: { deletedAt: null } });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "player.restore",
        entityType: "Player",
        entityId: id,
      });
    });
    revalidatePlayerPages();
    return { id };
  });
}
