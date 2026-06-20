"use server";

import { prisma } from "@/lib/db";
import { teamCreateSchema, teamUpdateSchema } from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { liveMatchIdsForTeam } from "@/server/scoring/persist";
import { refreshSnapshot } from "@/server/scoring/snapshot";
import { rebuildSeasonStats } from "@/server/scoring/leaderboard";
import {
  revalidatePublic,
  PUBLIC_HOME,
  PUBLIC_MATCHES,
  PUBLIC_SQUADS,
  PUBLIC_LEADERBOARD,
  PUBLIC_POPULAR,
} from "@/server/revalidate";

const revalidateTeamPages = () =>
  revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES, PUBLIC_SQUADS, PUBLIC_LEADERBOARD, PUBLIC_POPULAR);

export async function createTeam(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = teamCreateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({ data: input });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "team.create",
        entityType: "Team",
        entityId: created.id,
        after: input,
      });
      return created;
    });
    revalidateTeamPages();
    return { id: team.id };
  });
}

export async function updateTeam(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { id, ...data } = teamUpdateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const before = await prisma.team.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ActionError("NOT_FOUND", "Team not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id }, data });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "team.update",
        entityType: "Team",
        entityId: id,
        before,
        after: data,
      });
      // Name/logo/color changes must reach the public payloads LIVE.
      for (const matchId of await liveMatchIdsForTeam(tx, id)) {
        await refreshSnapshot(tx, matchId);
      }
    });
    revalidateTeamPages();
    return { id };
  });
}

/**
 * Soft delete — history that references the team stays intact (rows are
 * hidden via deletedAt, never erased). Cascades to:
 *  - the team's own players (soft-deleted too, team-history closed) so
 *    nobody is left visible on a "deleted" team's roster, and
 *  - every match this team played that isn't upcoming/live (DRAFT/COMPLETED/
 *    ABANDONED), since a fixture referencing a removed team has no business
 *    staying on the public site. Upcoming/live matches block the delete
 *    entirely (below) — those need a deliberate admin decision, not a
 *    silent side effect.
 * A completed match that gets cascaded away affects the OPPONENT team's
 * record too (their stats/standings lose that match) — a season-stats
 * rebuild runs after the transaction so every number stays correct.
 */
export async function softDeleteTeam(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team || team.deletedAt) {
      throw new ActionError("NOT_FOUND", "Team not found");
    }
    const active = await prisma.matchTeam.count({
      where: {
        teamId: id,
        match: {
          deletedAt: null,
          status: { in: ["UPCOMING", "LIVE", "INNINGS_BREAK"] },
        },
      },
    });
    if (active > 0) {
      throw new ActionError(
        "INVALID_STATE",
        "Team has upcoming or live matches — remove those fixtures first",
      );
    }

    const seasonIds = new Set<string>();

    await prisma.$transaction(async (tx) => {
      const [players, matches] = await Promise.all([
        tx.player.findMany({
          where: { teamId: id, deletedAt: null },
          select: { id: true },
        }),
        tx.match.findMany({
          where: {
            deletedAt: null,
            matchTeams: { some: { teamId: id } },
          },
          select: { id: true, seasonId: true, status: true },
        }),
      ]);
      const playerIds = players.map((p) => p.id);
      const now = new Date();

      await tx.team.update({
        where: { id },
        data: { deletedAt: now, status: "SUSPENDED" },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "team.softDelete",
        entityType: "Team",
        entityId: id,
        before: team,
        details: `Cascaded to ${playerIds.length} players and ${matches.length} matches`,
      });

      if (playerIds.length > 0) {
        await tx.player.updateMany({
          where: { id: { in: playerIds } },
          data: { deletedAt: now },
        });
        await tx.playerTeamHistory.updateMany({
          where: { playerId: { in: playerIds }, toDate: null },
          data: { toDate: now },
        });
        for (const playerId of playerIds) {
          await writeAudit(tx, {
            userId: actor.userId,
            action: "player.softDelete",
            entityType: "Player",
            entityId: playerId,
            details: `Cascaded from team.softDelete of "${team.name}"`,
          });
        }
      }

      if (matches.length > 0) {
        await tx.match.updateMany({
          where: { id: { in: matches.map((m) => m.id) } },
          data: { deletedAt: now },
        });
        for (const m of matches) {
          seasonIds.add(m.seasonId);
          await writeAudit(tx, {
            userId: actor.userId,
            action: "match.softDelete",
            entityType: "Match",
            entityId: m.id,
            details: `Cascaded from team.softDelete of "${team.name}"`,
          });
        }
      }
    }, { timeout: 30000, maxWait: 10000 });

    // Completed matches among those just removed contributed to other
    // teams'/players' career stats and standings — rebuild so those numbers
    // stop counting them. Never block the team delete on this.
    for (const seasonId of seasonIds) {
      try {
        await prisma.$transaction(
          (tx) => rebuildSeasonStats(tx, seasonId, `team:${id} soft-delete`),
          { timeout: 60000, maxWait: 10000 },
        );
      } catch (err) {
        console.error("[softDeleteTeam] leaderboard rebuild failed:", err);
      }
    }

    revalidateTeamPages();
    return { id };
  });
}

export async function restoreTeam(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team || !team.deletedAt) {
      throw new ActionError("NOT_FOUND", "No deleted team with that id");
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: { deletedAt: null, status: "ACTIVE" },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "team.restore",
        entityType: "Team",
        entityId: id,
      });
    });
    revalidateTeamPages();
    return { id };
  });
}
