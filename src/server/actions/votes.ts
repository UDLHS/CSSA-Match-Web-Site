"use server";

import { prisma } from "@/lib/db";
import { setVotesSchema } from "@/lib/validation";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { revalidatePublic, PUBLIC_POPULAR, PUBLIC_HOME } from "@/server/revalidate";

/**
 * Popularity votes are ADMIN-SET only (never public voting). Every change
 * is audit-logged with the admin's note — backend-spec §2E.
 */
export async function setPopularVotes(
  raw: unknown,
): Promise<ActionResult<{ playerId: string; votes: number }>> {
  return runAction(async () => {
    const input = setVotesSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const player = await prisma.player.findUnique({
      where: { id: input.playerId },
    });
    if (!player || player.deletedAt) {
      throw new ActionError("NOT_FOUND", "Player not found");
    }

    const before = await prisma.popularVote.findUnique({
      where: { playerId: input.playerId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.popularVote.upsert({
        where: { playerId: input.playerId },
        create: {
          playerId: input.playerId,
          votes: input.votes,
          note: input.note,
          updatedByUserId: actor.userId,
        },
        update: {
          votes: input.votes,
          note: input.note,
          updatedByUserId: actor.userId,
        },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "votes.adjust",
        entityType: "PopularVote",
        entityId: input.playerId,
        before: { votes: before?.votes ?? 0 },
        after: { votes: input.votes },
        details: input.note,
      });
    });
    revalidatePublic(PUBLIC_POPULAR, PUBLIC_HOME);
    return { playerId: input.playerId, votes: input.votes };
  });
}
