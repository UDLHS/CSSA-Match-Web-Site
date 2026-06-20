"use server";

import { prisma } from "@/lib/db";
import {
  abandonMatchSchema,
  completeMatchSchema,
  endInningsSchema,
  startInningsSchema,
} from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import {
  requireRole,
  SCORING_ROLES,
  MASTER_DATA_ROLES,
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

/**
 * Match lifecycle: publish → start match → start innings → (scoring) →
 * end innings → complete match. Every step re-checks authz, audits, and
 * refreshes the live snapshot in the same transaction.
 */

export async function publishMatch(
  raw: unknown,
): Promise<ActionResult<{ snapshotVersion: number }>> {
  return runAction(async () => {
    const matchId = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status !== "DRAFT") {
      throw new ActionError("INVALID_STATE", "Only DRAFT matches can be published");
    }

    const version = await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: { status: "UPCOMING", publishedAt: new Date() },
      });
      const v = await refreshSnapshot(tx, matchId);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.publish",
        entityType: "Match",
        entityId: matchId,
      });
      return v;
    });
    // Now shows under "Upcoming" on the public site — don't wait on the cache.
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES);
    return { snapshotVersion: version };
  });
}

export async function startMatch(
  raw: unknown,
): Promise<ActionResult<{ snapshotVersion: number }>> {
  return runAction(async () => {
    const matchId = idSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { matchTeams: true, playingXI: true },
    });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status !== "UPCOMING") {
      throw new ActionError(
        "INVALID_STATE",
        `Match must be UPCOMING to start (current: ${match.status})`,
      );
    }
    if (!match.tossWonByTeamId || !match.tossDecision) {
      throw new ActionError("INVALID_STATE", "Record the toss before starting");
    }
    for (const mt of match.matchTeams) {
      const count = match.playingXI.filter((p) => p.teamId === mt.teamId).length;
      if (count !== match.playersPerSide) {
        throw new ActionError(
          "INVALID_STATE",
          `Playing XI incomplete: team has ${count}/${match.playersPerSide} players`,
        );
      }
    }

    const version = await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: { status: "LIVE" },
      });
      const v = await refreshSnapshot(tx, matchId);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.start",
        entityType: "Match",
        entityId: matchId,
      });
      return v;
    });
    // Now shows under "Live" on the public site — don't wait on the cache.
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES);
    return { snapshotVersion: version };
  });
}

export async function startInnings(
  raw: unknown,
): Promise<ActionResult<{ inningsId: string; snapshotVersion: number }>> {
  return runAction(async () => {
    const input = startInningsSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);

    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
      include: {
        matchTeams: true,
        playingXI: true,
        innings: { orderBy: { inningsNumber: "asc" } },
      },
    });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status !== "LIVE" && match.status !== "INNINGS_BREAK") {
      throw new ActionError(
        "INVALID_STATE",
        `Match must be LIVE or at INNINGS_BREAK (current: ${match.status})`,
      );
    }
    if (input.inningsNumber !== match.innings.length + 1) {
      throw new ActionError(
        "INVALID_STATE",
        `Next innings is #${match.innings.length + 1}`,
      );
    }
    const battingMt = match.matchTeams.find(
      (mt) => mt.teamId === input.battingTeamId,
    );
    if (!battingMt) {
      throw new ActionError("VALIDATION", "Batting team is not in this match");
    }
    const bowlingMt = match.matchTeams.find(
      (mt) => mt.teamId !== input.battingTeamId,
    );
    if (!bowlingMt) {
      throw new ActionError("INVALID_STATE", "Match is missing its second team");
    }

    const xi = match.playingXI.filter((p) => p.teamId === input.battingTeamId);
    for (const opener of [input.openingStrikerId, input.openingNonStrikerId]) {
      if (xi.length > 0 && !xi.some((p) => p.playerId === opener)) {
        throw new ActionError(
          "VALIDATION",
          "Opening batters must come from the playing XI",
        );
      }
    }

    // Even innings chase the previous innings' total (2 chases 1, 4 chases 3).
    let target: number | null = null;
    if (input.inningsNumber % 2 === 0) {
      const previous = match.innings[input.inningsNumber - 2];
      if (!previous || previous.status !== "COMPLETED") {
        throw new ActionError(
          "INVALID_STATE",
          "Previous innings must be completed first",
        );
      }
      target = previous.totalRuns + 1;
    }

    const result = await prisma.$transaction(async (tx) => {
      const innings = await tx.innings.create({
        data: {
          matchId: match.id,
          inningsNumber: input.inningsNumber,
          battingTeamId: input.battingTeamId,
          bowlingTeamId: bowlingMt.teamId,
          status: "IN_PROGRESS",
          oversLimit: match.oversPerSide,
          ballsPerOver: match.ballsPerOver,
          target,
          openingStrikerId: input.openingStrikerId,
          openingNonStrikerId: input.openingNonStrikerId,
        },
      });
      await tx.match.update({
        where: { id: match.id },
        data: { status: "LIVE" },
      });
      const v = await refreshSnapshot(tx, match.id);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "innings.start",
        entityType: "Innings",
        entityId: innings.id,
        after: {
          inningsNumber: input.inningsNumber,
          battingTeamId: input.battingTeamId,
          target,
        },
      });
      return { inningsId: innings.id, snapshotVersion: v };
    });
    // INNINGS_BREAK -> LIVE moves the match back to the "Live" tab.
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES);
    return result;
  });
}

/** Manual / declared close — an admin decision the replay can't derive. */
export async function endInnings(
  raw: unknown,
): Promise<ActionResult<{ snapshotVersion: number }>> {
  return runAction(async () => {
    const input = endInningsSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);

    const innings = await prisma.innings.findUnique({
      where: { id: input.inningsId },
      include: { match: true },
    });
    if (!innings || innings.match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Innings not found");
    }
    if (innings.status === "COMPLETED") {
      throw new ActionError("INVALID_STATE", "Innings is already closed");
    }

    const version = await prisma.$transaction(async (tx) => {
      await tx.innings.update({
        where: { id: innings.id },
        data: { status: "COMPLETED", closeReason: input.reason },
      });
      if (innings.inningsNumber === 1 && innings.match.status === "LIVE") {
        await tx.match.update({
          where: { id: innings.matchId },
          data: { status: "INNINGS_BREAK" },
        });
      }
      const v = await refreshSnapshot(tx, innings.matchId);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "innings.end",
        entityType: "Innings",
        entityId: innings.id,
        after: { closeReason: input.reason },
      });
      return v;
    });
    // Innings 1 ending moves the match to "Innings break" on the public site.
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES);
    return { snapshotVersion: version };
  });
}

export async function completeMatch(
  raw: unknown,
): Promise<ActionResult<{ snapshotVersion: number; resultText: string }>> {
  return runAction(async () => {
    const input = completeMatchSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);

    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
      include: {
        matchTeams: { include: { team: true } },
        innings: { orderBy: { inningsNumber: "asc" } },
      },
    });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status !== "LIVE" && match.status !== "INNINGS_BREAK") {
      throw new ActionError(
        "INVALID_STATE",
        `Match must be in play to complete (current: ${match.status})`,
      );
    }

    const teamName = (id: string | null) =>
      match.matchTeams.find((mt) => mt.teamId === id)?.team.name ?? "Unknown";

    // Compute the result from the chase unless the admin overrides it.
    let resultText = input.resultText ?? null;
    let winnerTeamId = input.winnerTeamId ?? null;
    if (!resultText) {
      const i1 = match.innings.find((i) => i.inningsNumber === 1);
      const i2 = match.innings.find((i) => i.inningsNumber === 2);
      if (!i1 || !i2 || !i2.target) {
        throw new ActionError(
          "INVALID_STATE",
          "Result can't be derived — both innings must exist (or pass an explicit resultText)",
        );
      }
      if (i2.totalRuns >= i2.target) {
        const wicketsLeft = match.playersPerSide - 1 - i2.wickets;
        winnerTeamId = i2.battingTeamId;
        resultText = `${teamName(winnerTeamId)} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}`;
      } else if (i2.status === "COMPLETED") {
        if (i2.totalRuns === i2.target - 1) {
          winnerTeamId = null;
          resultText = "Match tied";
        } else {
          const margin = i2.target - 1 - i2.totalRuns;
          winnerTeamId = i2.bowlingTeamId;
          resultText = `${teamName(winnerTeamId)} won by ${margin} run${margin === 1 ? "" : "s"}`;
        }
      } else {
        throw new ActionError(
          "INVALID_STATE",
          "Second innings is still in progress — end it first or pass an explicit result",
        );
      }
    }

    if (input.playerOfMatchId) {
      const pom = await prisma.player.findUnique({
        where: { id: input.playerOfMatchId },
      });
      if (!pom || pom.deletedAt) {
        throw new ActionError("VALIDATION", "Player of the match not found");
      }
    }

    const version = await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: "COMPLETED",
          resultText,
          winnerTeamId,
          playerOfMatchId: input.playerOfMatchId ?? null,
        },
      });
      // Any innings left open is closed as MANUAL for the record.
      await tx.innings.updateMany({
        where: { matchId: match.id, status: "IN_PROGRESS" },
        data: { status: "COMPLETED", closeReason: "MANUAL" },
      });
      const v = await refreshSnapshot(tx, match.id);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.complete",
        entityType: "Match",
        entityId: match.id,
        after: { resultText, winnerTeamId, playerOfMatchId: input.playerOfMatchId },
      });
      return v;
    });

    // Leaderboards rebuild on completion (backend-spec §7) — failure here
    // must not roll back the completed match.
    try {
      await prisma.$transaction(
        (tx) =>
          rebuildSeasonStats(tx, match.seasonId, `match:${match.id} completion`),
        { timeout: 60000, maxWait: 10000 },
      );
    } catch (err) {
      console.error("[completeMatch] leaderboard rebuild failed:", err);
    }

    // The result + refreshed leaderboard should show publicly right away.
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES, PUBLIC_LEADERBOARD);
    return { snapshotVersion: version, resultText: resultText! };
  });
}

export async function abandonMatch(
  raw: unknown,
): Promise<ActionResult<{ snapshotVersion: number }>> {
  return runAction(async () => {
    const input = abandonMatchSchema.parse(raw);
    // Scorers can call this from the console; editors/super can do it anywhere.
    const actor = await requireRole(SCORING_ROLES);

    const match = await prisma.match.findUnique({
      where: { id: input.matchId },
    });
    if (!match || match.deletedAt) {
      throw new ActionError("NOT_FOUND", "Match not found");
    }
    if (match.status === "COMPLETED" || match.status === "ABANDONED") {
      throw new ActionError("INVALID_STATE", "Match is already finished");
    }

    const version = await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: "ABANDONED",
          resultText: `Match abandoned — ${input.reason}`,
        },
      });
      const v = await refreshSnapshot(tx, match.id);
      await writeAudit(tx, {
        userId: actor.userId,
        action: "match.abandon",
        entityType: "Match",
        entityId: match.id,
        after: { reason: input.reason },
      });
      return v;
    });
    // The match disappears from Live + appears in Previous on the public site.
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES);
    return { snapshotVersion: version };
  });
}
