"use server";

import { prisma } from "@/lib/db";
import {
  matchCreateSchema,
  matchUpdateSchema,
  playingXISchema,
  tossSchema,
} from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import {
  requireRole,
  MASTER_DATA_ROLES,
  SCORING_ROLES,
} from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { refreshSnapshot } from "@/server/scoring/snapshot";
import { rebuildSeasonStats } from "@/server/scoring/leaderboard";
import {
  revalidatePublic,
  PUBLIC_HOME,
  PUBLIC_MATCHES,
  PUBLIC_LEADERBOARD,
} from "@/server/revalidate";

export async function createMatch(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = matchCreateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const teams = await prisma.team.findMany({
      where: { id: { in: [input.homeTeamId, input.awayTeamId] }, deletedAt: null },
    });
    if (teams.length !== 2) {
      throw new ActionError("VALIDATION", "Both teams must exist and be active");
    }

    // Match number is unique per season among ACTIVE matches only — a deleted
    // match's number is free to reuse. Give a clear message instead of a
    // cryptic "concurrent write" if an active one really does clash.
    const clash = await prisma.match.findFirst({
      where: { seasonId: input.seasonId, matchNumber: input.matchNumber, deletedAt: null },
      select: { id: true },
    });
    if (clash) {
      throw new ActionError(
        "VALIDATION",
        `Match number ${input.matchNumber} is already used in this season — pick a different number.`,
      );
    }

    const { homeTeamId, awayTeamId, ...matchData } = input;
    const match = await prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          ...matchData,
          status: "DRAFT",
          matchTeams: {
            create: [
              { teamId: homeTeamId, isHome: true },
              { teamId: awayTeamId, isHome: false },
            ],
          },
        },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.create",
        entityType: "Match",
        entityId: created.id,
        after: input,
      });
      return created;
    });
    return { id: match.id };
  });
}

export async function updateMatch(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { id, ...data } = matchUpdateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const before = await prisma.match.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    // Format/overs changes after the first ball would invalidate the replay.
    if (
      before.status !== "DRAFT" &&
      before.status !== "UPCOMING" &&
      (data.oversPerSide !== undefined ||
        data.ballsPerOver !== undefined ||
        data.playersPerSide !== undefined ||
        data.format !== undefined)
    ) {
      throw new ActionError(
        "INVALID_STATE",
        "Format and overs are locked once the match has started",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.match.update({ where: { id }, data });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.update",
        entityType: "Match",
        entityId: id,
        before,
        after: data,
      });
      if (before.status !== "DRAFT") {
        await refreshSnapshot(tx, id); // schedule/venue changes go out live
      }
    });
    return { id };
  });
}

export async function setPlayingXI(
  raw: unknown,
): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const input = playingXISchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
      include: { matchTeams: true },
    });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status !== "DRAFT" && match.status !== "UPCOMING") {
      throw new ActionError(
        "INVALID_STATE",
        "The XI is locked once the match has started",
      );
    }
    if (!match.matchTeams.some((mt) => mt.teamId === input.teamId)) {
      throw new ActionError("VALIDATION", "Team is not in this match");
    }
    if (input.players.length !== match.playersPerSide) {
      throw new ActionError(
        "VALIDATION",
        `XI must have exactly ${match.playersPerSide} players`,
      );
    }
    const players = await prisma.player.findMany({
      where: {
        id: { in: input.players.map((p) => p.playerId) },
        teamId: input.teamId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (players.length !== input.players.length) {
      throw new ActionError(
        "VALIDATION",
        "Every XI member must be an active player of this team",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.playingXI.deleteMany({
        where: { matchId: input.matchId, teamId: input.teamId },
      });
      await tx.playingXI.createMany({
        data: input.players.map((p) => ({
          matchId: input.matchId,
          teamId: input.teamId,
          playerId: p.playerId,
          battingOrder: p.battingOrder,
          isKeeper: p.isKeeper,
        })),
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.setXI",
        entityType: "Match",
        entityId: input.matchId,
        after: { teamId: input.teamId, players: input.players },
      });
    });
    return { count: input.players.length };
  });
}

export async function setToss(
  raw: unknown,
): Promise<ActionResult<{ matchId: string }>> {
  return runAction(async () => {
    const input = tossSchema.parse(raw);
    // The scorer records the toss right before starting — scoring roles.
    const actor = await requireRole(SCORING_ROLES);

    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
      include: { matchTeams: true },
    });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status !== "DRAFT" && match.status !== "UPCOMING") {
      throw new ActionError(
        "INVALID_STATE",
        "The toss is locked once the match has started",
      );
    }
    if (!match.matchTeams.some((mt) => mt.teamId === input.tossWonByTeamId)) {
      throw new ActionError("VALIDATION", "Toss winner is not in this match");
    }

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: input.matchId },
        data: {
          tossWonByTeamId: input.tossWonByTeamId,
          tossDecision: input.decision,
        },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.setToss",
        entityType: "Match",
        entityId: input.matchId,
        after: input,
      });
      if (match.status !== "DRAFT") {
        await refreshSnapshot(tx, input.matchId);
      }
    });
    return { matchId: input.matchId };
  });
}

/**
 * Soft delete — only this match. Teams/players that played it are untouched;
 * deliveries/stats/snapshot stay in the database (hidden, not erased) since
 * every public/admin read already filters through `match.deletedAt`.
 */
export async function softDeleteMatch(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const match = await prisma.match.findUnique({ where: { id } });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status === "LIVE" || match.status === "INNINGS_BREAK") {
      throw new ActionError(
        "INVALID_STATE",
        "A live match cannot be deleted — abandon it first",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.softDelete",
        entityType: "Match",
        entityId: id,
        before: match,
      });
    });

    // A completed match contributed to career stats/standings — rebuild so
    // those numbers stop counting it. Never block the delete on this.
    if (match.status === "COMPLETED") {
      try {
        await prisma.$transaction(
          (tx) => rebuildSeasonStats(tx, match.seasonId, `match:${id} soft-delete`),
          { timeout: 60000, maxWait: 10000 },
        );
      } catch (err) {
        console.error("[softDeleteMatch] leaderboard rebuild failed:", err);
      }
    }

    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES, PUBLIC_LEADERBOARD);
    return { id };
  });
}
