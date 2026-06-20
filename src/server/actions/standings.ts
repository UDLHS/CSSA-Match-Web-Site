"use server";

import { prisma } from "@/lib/db";
import { standingUpsertSchema } from "@/lib/validation";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import {
  bustTags,
  revalidatePublic,
  PUBLIC_HOME,
  PUBLIC_LEADERBOARD,
} from "@/server/revalidate";
import { TAG } from "@/server/cache";

function bustStandings() {
  bustTags(TAG.standings);
  revalidatePublic(PUBLIC_HOME, PUBLIC_LEADERBOARD);
}

/**
 * Set the manual half of a team's points-table row: group, qualification
 * badge, and optional points/NRR overrides. Points and NRR themselves are
 * computed automatically by the leaderboard engine on every match
 * completion (server/scoring/leaderboard.ts) — passing null/omitting an
 * override here just means "use the automatic value."
 */
export async function upsertStanding(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = standingUpsertSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const [season, team] = await Promise.all([
      prisma.season.findUnique({ where: { id: input.seasonId }, select: { id: true } }),
      prisma.team.findFirst({
        where: { id: input.teamId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!season) throw new ActionError("VALIDATION", "Season not found");
    if (!team) throw new ActionError("VALIDATION", "Team not found or deleted");

    const data = {
      groupName: input.groupName ?? "",
      pointsOverride: input.pointsOverride ?? null,
      nrrOverride: input.nrrOverride ?? null,
      status: input.status,
      sortHint: input.sortHint,
    };

    const row = await prisma.$transaction(async (tx) => {
      const saved = await tx.teamStanding.upsert({
        where: { seasonId_teamId: { seasonId: input.seasonId, teamId: input.teamId } },
        create: { seasonId: input.seasonId, teamId: input.teamId, ...data },
        update: data,
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "standing.upsert",
        entityType: "TeamStanding",
        entityId: saved.id,
        after: { teamId: input.teamId, ...data },
      });
      return saved;
    });

    bustStandings();
    return { id: row.id };
  });
}
