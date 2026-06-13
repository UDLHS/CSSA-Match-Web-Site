"use server";

import { prisma } from "@/lib/db";
import {
  applyEvent,
  editEvent as engineEditEvent,
  getInningsSummary,
  replayInnings,
  type DeliveryEvent,
  type InningsEvent,
  type InningsState,
  type InningsSummary,
} from "@/lib/scoring";
import {
  editDeliverySchema,
  recordDeliverySchema,
  recordPenaltySchema,
  recordRetirementSchema,
  swapStrikeSchema,
  undoLastEventSchema,
  type RecordDeliveryInput,
} from "@/lib/validation";
import { requireRole, SCORING_ROLES, MASTER_DATA_ROLES, type ActorContext } from "@/server/auth";
import { writeAudit, type Db } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import {
  loadInningsContext,
  syncInningsDerived,
  type InningsContext,
} from "@/server/scoring/persist";
import {
  readSnapshotVersion,
  refreshSnapshot,
} from "@/server/scoring/snapshot";
import { encodeEventRow } from "@/server/scoring/codec";
import { idSchema } from "@/lib/validation/common";

/**
 * Ball-by-ball scoring mutations. Shared invariants (CLAUDE.md rules 2–4):
 *  - authz re-checked server-side on every call
 *  - source of truth is the Delivery event stream; every derived value is
 *    recomputed by replay inside ONE transaction
 *  - duplicate idempotencyKey → harmless replay response, never a second row
 *  - (inningsId, sequence) unique + snapshot version check stop concurrent
 *    scorers from interleaving silently
 */

export interface ScoreMutationOutcome {
  duplicate: boolean;
  sequence: number;
  snapshotVersion: number;
  summary: InningsSummary;
  inningsClosed: boolean;
  closeReason: string | null;
}

// ----------------------------------------------------------------
// Shared append path
// ----------------------------------------------------------------

interface AppendArgs {
  actor: ActorContext;
  inningsId: string;
  idempotencyKey: string;
  expectedSequence?: number;
  event: InningsEvent;
  auditAction: string;
}

async function appendEvent(args: AppendArgs): Promise<ScoreMutationOutcome> {
  const { actor, inningsId, idempotencyKey, event } = args;

  // Idempotent replay: same tap recorded before → report success, write nothing.
  const dup = await prisma.delivery.findUnique({
    where: { idempotencyKey },
    select: { inningsId: true, sequence: true },
  });
  if (dup) {
    const ctxDup = await loadInningsContext(prisma, dup.inningsId);
    return {
      duplicate: true,
      sequence: dup.sequence,
      snapshotVersion:
        (await readSnapshotVersion(prisma, ctxDup.innings.matchId)) ?? 0,
      summary: getInningsSummary(ctxDup.state),
      inningsClosed: ctxDup.state.status === "COMPLETED",
      closeReason: ctxDup.state.closeReason,
    };
  }

  const ctx = await loadInningsContext(prisma, inningsId);
  const match = ctx.innings.match;
  if (match.status !== "LIVE") {
    throw new ActionError(
      "INVALID_STATE",
      `Scoring requires a LIVE match (current status: ${match.status})`,
    );
  }
  if (ctx.innings.status === "COMPLETED" || ctx.state.status === "COMPLETED") {
    throw new ActionError("INVALID_STATE", "Innings is already closed");
  }

  const nextSequence = ctx.rows.length + 1;
  if (
    args.expectedSequence !== undefined &&
    args.expectedSequence !== nextSequence
  ) {
    throw new ActionError(
      "CONFLICT",
      `Client expected ball #${args.expectedSequence} but the next is #${nextSequence} — another scorer is active`,
    );
  }

  const prevState = ctx.state;
  const newState = applyEvent(prevState, event); // ScoringError on bad input

  const rowData = encodeEventRow({
    inningsId: ctx.innings.id,
    ballsPerOver: ctx.innings.ballsPerOver,
    sequence: nextSequence,
    event,
    prevState,
    newState,
    idempotencyKey,
    createdById: actor.userId,
  });

  const txOut = await prisma.$transaction(
    async (tx) => {
      const created = await tx.delivery.create({
        data: rowData,
        include: { wicket: true },
      });
      const newRows = [...ctx.rows, created];
      const newEvents = [...ctx.events, event];
      await syncInningsDerived(
        tx,
        ctx.innings,
        newRows,
        newEvents,
        newState,
        nextSequence,
      );
      await syncMatchStatus(tx, match.id, match.status, ctx.innings.inningsNumber, newState);
      const version = await refreshSnapshot(tx, match.id);
      await writeAudit(tx, {
        userId: actor.userId,
        action: args.auditAction,
        entityType: "Delivery",
        entityId: created.id,
        after: { sequence: nextSequence, event },
        details: `innings ${ctx.innings.inningsNumber}, event #${nextSequence}`,
      });
      return version;
    },
    { timeout: 20000, maxWait: 10000 },
  );

  return {
    duplicate: false,
    sequence: nextSequence,
    snapshotVersion: txOut,
    summary: getInningsSummary(newState),
    inningsClosed: newState.status === "COMPLETED",
    closeReason: newState.closeReason,
  };
}

/** Innings 1 closing/reopening moves the match LIVE ⇄ INNINGS_BREAK. */
async function syncMatchStatus(
  tx: Db,
  matchId: string,
  currentStatus: string,
  inningsNumber: number,
  state: InningsState,
): Promise<void> {
  if (inningsNumber !== 1) return;
  if (state.status === "COMPLETED" && currentStatus === "LIVE") {
    await tx.match.update({
      where: { id: matchId },
      data: { status: "INNINGS_BREAK" },
    });
  } else if (state.status === "IN_PROGRESS" && currentStatus === "INNINGS_BREAK") {
    await tx.match.update({ where: { id: matchId }, data: { status: "LIVE" } });
  }
}

function toDeliveryEvent(
  input: Omit<
    RecordDeliveryInput,
    "inningsId" | "idempotencyKey" | "expectedSequence"
  >,
): DeliveryEvent {
  return {
    kind: "delivery",
    bowlerId: input.bowlerId,
    runsOffBat: input.runsOffBat,
    extraType: input.extraType ?? null,
    extraRuns: input.extraRuns,
    batRunsAreBoundary: input.batRunsAreBoundary,
    extrasAreBoundary: input.extrasAreBoundary,
    wicket: input.wicket
      ? {
          type: input.wicket.type,
          dismissedPlayerId: input.wicket.dismissedPlayerId,
          bowlerCredited: input.wicket.bowlerCredited,
          fielderId: input.wicket.fielderId ?? undefined,
          assistFielderId: input.wicket.assistFielderId ?? undefined,
          directHit: input.wicket.directHit,
          battersCrossed: input.wicket.battersCrossed,
          notes: input.wicket.notes ?? undefined,
        }
      : null,
    newBatterId: input.newBatterId ?? null,
    commentary: input.commentary ?? undefined,
  };
}

/** Undo/edit on innings 1 after innings 2 exists would shift the target. */
async function assertNoLaterInnings(ctx: InningsContext): Promise<void> {
  const later = await prisma.innings.count({
    where: {
      matchId: ctx.innings.matchId,
      inningsNumber: { gt: ctx.innings.inningsNumber },
    },
  });
  if (later > 0) {
    throw new ActionError(
      "INVALID_STATE",
      "A later innings already exists — its target depends on this one. Undo the later innings first or use admin recalculation.",
    );
  }
}

// ----------------------------------------------------------------
// Public actions
// ----------------------------------------------------------------

export async function recordDelivery(
  raw: unknown,
): Promise<ActionResult<ScoreMutationOutcome>> {
  return runAction(async () => {
    const input = recordDeliverySchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);
    return appendEvent({
      actor,
      inningsId: input.inningsId,
      idempotencyKey: input.idempotencyKey,
      expectedSequence: input.expectedSequence,
      event: toDeliveryEvent(input),
      auditAction: "delivery.create",
    });
  });
}

export async function recordPenalty(
  raw: unknown,
): Promise<ActionResult<ScoreMutationOutcome>> {
  return runAction(async () => {
    const input = recordPenaltySchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);
    return appendEvent({
      actor,
      inningsId: input.inningsId,
      idempotencyKey: input.idempotencyKey,
      event: { kind: "penalty", runs: input.runs, reason: input.reason ?? undefined },
      auditAction: "penalty.create",
    });
  });
}

export async function recordRetirement(
  raw: unknown,
): Promise<ActionResult<ScoreMutationOutcome>> {
  return runAction(async () => {
    const input = recordRetirementSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);
    return appendEvent({
      actor,
      inningsId: input.inningsId,
      idempotencyKey: input.idempotencyKey,
      event: {
        kind: "retirement",
        playerId: input.playerId,
        type: input.type,
        newBatterId: input.newBatterId ?? null,
        notes: input.notes ?? undefined,
      },
      auditAction: "retirement.create",
    });
  });
}

export async function swapStrike(
  raw: unknown,
): Promise<ActionResult<ScoreMutationOutcome>> {
  return runAction(async () => {
    const input = swapStrikeSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);
    return appendEvent({
      actor,
      inningsId: input.inningsId,
      idempotencyKey: input.idempotencyKey,
      event: { kind: "swapEnds" },
      auditAction: "strike.swap",
    });
  });
}

export async function undoLastEvent(
  raw: unknown,
): Promise<ActionResult<ScoreMutationOutcome>> {
  return runAction(async () => {
    const input = undoLastEventSchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);

    const ctx = await loadInningsContext(prisma, input.inningsId);
    const match = ctx.innings.match;
    if (match.status === "COMPLETED" || match.status === "ABANDONED") {
      throw new ActionError(
        "INVALID_STATE",
        "Match is finished — undo is locked",
      );
    }
    if (ctx.rows.length === 0) {
      throw new ActionError("INVALID_STATE", "Nothing to undo");
    }
    await assertNoLaterInnings(ctx);

    const last = ctx.rows[ctx.rows.length - 1];
    const newRows = ctx.rows.slice(0, -1);
    const newEvents = ctx.events.slice(0, -1);
    const newState = replayInnings(ctx.config, newEvents);

    const version = await prisma.$transaction(
      async (tx) => {
        await tx.delivery.delete({ where: { id: last.id } }); // wicket cascades
        await syncInningsDerived(
          tx,
          ctx.innings,
          newRows,
          newEvents,
          newState,
          last.sequence,
        );
        await syncMatchStatus(tx, match.id, match.status, ctx.innings.inningsNumber, newState);
        const v = await refreshSnapshot(tx, match.id);
        await writeAudit(tx, {
          userId: actor.userId,
          action: "delivery.undo",
          entityType: "Delivery",
          entityId: last.id,
          before: {
            sequence: last.sequence,
            runsOffBat: last.runsOffBat,
            extraType: last.extraType,
            extraRuns: last.extraRuns,
            wicket: last.wicket?.type ?? null,
          },
          details: `undid event #${last.sequence}`,
        });
        return v;
      },
      { timeout: 20000, maxWait: 10000 },
    );

    return {
      duplicate: false,
      sequence: newRows.length,
      snapshotVersion: version,
      summary: getInningsSummary(newState),
      inningsClosed: newState.status === "COMPLETED",
      closeReason: newState.closeReason,
    };
  });
}

export async function editDelivery(
  raw: unknown,
): Promise<ActionResult<ScoreMutationOutcome>> {
  return runAction(async () => {
    const input = editDeliverySchema.parse(raw);
    const actor = await requireRole(SCORING_ROLES);

    const ctx = await loadInningsContext(prisma, input.inningsId);
    const match = ctx.innings.match;
    if (match.status === "COMPLETED" || match.status === "ABANDONED") {
      throw new ActionError(
        "INVALID_STATE",
        "Match is finished — edits are locked",
      );
    }
    await assertNoLaterInnings(ctx);

    const row = ctx.rows.find((r) => r.sequence === input.sequence);
    if (!row) {
      throw new ActionError("NOT_FOUND", `No event #${input.sequence}`);
    }
    if (row.isNonBall) {
      throw new ActionError(
        "INVALID_STATE",
        "Only deliveries can be edited — undo non-ball events instead",
      );
    }

    const replacement = toDeliveryEvent(input.replacement);
    // Replays the WHOLE innings with the replacement in place; trailing
    // events that become impossible make this throw — never half-applied.
    const { state: newState, events: newEvents } = engineEditEvent(
      ctx.config,
      ctx.events,
      input.sequence - 1,
      replacement,
    );

    const version = await prisma.$transaction(
      async (tx) => {
        await tx.delivery.update({
          where: { id: row.id },
          data: {
            bowlerId: replacement.bowlerId,
            runsOffBat: replacement.runsOffBat,
            extraType: replacement.extraType,
            extraRuns: replacement.extraRuns ?? (replacement.extraType ? 1 : 0),
            batRunsAreBoundary: replacement.batRunsAreBoundary ?? null,
            extrasAreBoundary: replacement.extrasAreBoundary ?? false,
            commentary: replacement.commentary ?? null,
            editedAt: new Date(),
          },
        });
        if (replacement.wicket) {
          const w = replacement.wicket;
          await tx.wicket.upsert({
            where: { deliveryId: row.id },
            create: {
              deliveryId: row.id,
              type: w.type,
              dismissedPlayerId: w.dismissedPlayerId,
              bowlerCredited: false, // derived fields rewritten by sync below
              fielderId: w.fielderId ?? null,
              assistFielderId: w.assistFielderId ?? null,
              directHit: w.directHit ?? false,
              battersCrossed: w.battersCrossed ?? false,
              newBatterId: replacement.newBatterId ?? null,
              notes: w.notes ?? null,
              wicketNumber: 0,
              scoreAtFall: 0,
              overBall: "0.0",
            },
            update: {
              type: w.type,
              dismissedPlayerId: w.dismissedPlayerId,
              fielderId: w.fielderId ?? null,
              assistFielderId: w.assistFielderId ?? null,
              directHit: w.directHit ?? false,
              battersCrossed: w.battersCrossed ?? false,
              newBatterId: replacement.newBatterId ?? null,
              notes: w.notes ?? null,
            },
          });
        } else if (row.wicket) {
          await tx.wicket.delete({ where: { id: row.wicket.id } });
        }

        const refreshed = await tx.delivery.findUniqueOrThrow({
          where: { id: row.id },
          include: { wicket: true },
        });
        const newRows = ctx.rows.map((r) => (r.id === row.id ? refreshed : r));
        await syncInningsDerived(
          tx,
          ctx.innings,
          newRows,
          newEvents,
          newState,
          input.sequence,
        );
        await syncMatchStatus(tx, match.id, match.status, ctx.innings.inningsNumber, newState);
        const v = await refreshSnapshot(tx, match.id);
        await writeAudit(tx, {
          userId: actor.userId,
          action: "delivery.edit",
          entityType: "Delivery",
          entityId: row.id,
          before: {
            runsOffBat: row.runsOffBat,
            extraType: row.extraType,
            extraRuns: row.extraRuns,
            wicket: row.wicket?.type ?? null,
          },
          after: { event: replacement },
          details: `edited event #${input.sequence}, replayed ${newEvents.length - input.sequence + 1} events`,
        });
        return v;
      },
      { timeout: 60000, maxWait: 10000 },
    );

    return {
      duplicate: false,
      sequence: input.sequence,
      snapshotVersion: version,
      summary: getInningsSummary(newState),
      inningsClosed: newState.status === "COMPLETED",
      closeReason: newState.closeReason,
    };
  });
}

/** Full resync of every innings + snapshot — the admin "recalculate" button. */
export async function recalculateMatch(
  raw: unknown,
): Promise<ActionResult<{ snapshotVersion: number }>> {
  return runAction(async () => {
    const matchId = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const innings = await prisma.innings.findMany({
      where: { matchId },
      select: { id: true },
      orderBy: { inningsNumber: "asc" },
    });
    if (innings.length === 0) {
      throw new ActionError("NOT_FOUND", "Match has no innings to recalculate");
    }

    const version = await prisma.$transaction(
      async (tx) => {
        for (const inn of innings) {
          const ctx = await loadInningsContext(tx, inn.id);
          await syncInningsDerived(
            tx,
            ctx.innings,
            ctx.rows,
            ctx.events,
            ctx.state,
            1, // rewrite every derived field from the first event
          );
        }
        const v = await refreshSnapshot(tx, matchId);
        await writeAudit(tx, {
          userId: actor.userId,
          action: "match.recalculate",
          entityType: "Match",
          entityId: matchId,
          details: `replayed ${innings.length} innings from scratch`,
        });
        return v;
      },
      { timeout: 120000, maxWait: 10000 },
    );

    return { snapshotVersion: version };
  });
}
