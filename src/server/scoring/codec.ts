import type { Delivery, Prisma, Wicket } from "@prisma/client";
import {
  BOWLER_CREDITED_TYPES,
  type DeliveryEvent,
  type ExtraType,
  type InningsEvent,
  type InningsState,
  type WicketInput,
  type WicketType,
} from "@/lib/scoring";
import { ActionError } from "@/server/errors";

/**
 * Lossless mapping between persisted Delivery rows and engine events.
 *
 * The Delivery table stores the FULL event stream in `sequence` order —
 * one row per event, discriminated without marker strings:
 *
 *   isNonBall=false                          → DeliveryEvent (a real ball)
 *   isNonBall=true + extraType=PENALTY       → PenaltyEvent
 *   isNonBall=true + wicket (RETIRED_*)      → RetirementEvent
 *   isNonBall=true + no extraType, no wicket → SwapEndsEvent
 *
 * decode(encode(event)) must equal the original event — replay correctness
 * depends on it.
 */

export type DeliveryRow = Delivery & { wicket: Wicket | null };

type BallExtra = Exclude<ExtraType, "PENALTY">;
type RetirementType = "RETIRED_HURT" | "RETIRED_OUT";

export function decodeEvent(row: DeliveryRow): InningsEvent {
  if (!row.isNonBall) {
    return decodeDelivery(row);
  }
  if (row.extraType === "PENALTY") {
    return {
      kind: "penalty",
      runs: row.extraRuns,
      reason: row.commentary ?? undefined,
    };
  }
  if (row.wicket) {
    const type = row.wicket.type as RetirementType;
    if (type !== "RETIRED_HURT" && type !== "RETIRED_OUT") {
      throw new ActionError(
        "INTERNAL",
        `Non-ball wicket row ${row.id} has non-retirement type ${row.wicket.type}`,
      );
    }
    return {
      kind: "retirement",
      playerId: row.wicket.dismissedPlayerId,
      type,
      newBatterId: row.wicket.newBatterId,
      notes: row.wicket.notes ?? undefined,
    };
  }
  return { kind: "swapEnds" };
}

function decodeDelivery(row: DeliveryRow): DeliveryEvent {
  if (!row.bowlerId) {
    throw new ActionError("INTERNAL", `Delivery row ${row.id} has no bowler`);
  }
  let wicket: WicketInput | null = null;
  if (row.wicket) {
    wicket = {
      type: row.wicket.type as WicketType,
      dismissedPlayerId: row.wicket.dismissedPlayerId,
      bowlerCredited: row.wicket.bowlerCredited,
      fielderId: row.wicket.fielderId ?? undefined,
      assistFielderId: row.wicket.assistFielderId ?? undefined,
      directHit: row.wicket.directHit,
      battersCrossed: row.wicket.battersCrossed,
      notes: row.wicket.notes ?? undefined,
    };
  }
  return {
    kind: "delivery",
    bowlerId: row.bowlerId,
    runsOffBat: row.runsOffBat,
    extraType: (row.extraType as BallExtra | null) ?? null,
    extraRuns: row.extraRuns,
    // null = "engine default" — never invent a value the scorer didn't enter
    batRunsAreBoundary: row.batRunsAreBoundary ?? undefined,
    extrasAreBoundary: row.extrasAreBoundary,
    wicket,
    newBatterId: row.wicket?.newBatterId ?? null,
    commentary: row.commentary ?? undefined,
  };
}

export function decodeEvents(rows: readonly DeliveryRow[]): InningsEvent[] {
  return rows.map(decodeEvent);
}

// ----------------------------------------------------------------
// Encode: event + replay states → row create data
// ----------------------------------------------------------------

export interface EncodeEventArgs {
  inningsId: string;
  ballsPerOver: number;
  sequence: number;
  event: InningsEvent;
  /** Innings state BEFORE this event (over/ball numbering, crease ends). */
  prevState: InningsState;
  /** Innings state AFTER this event (processed ball, wicket numbers). */
  newState: InningsState;
  idempotencyKey?: string | null;
  createdById?: string | null;
}

/** The single source for turning an applied event into its Delivery row. */
export function encodeEventRow(
  args: EncodeEventArgs,
): Prisma.DeliveryUncheckedCreateInput {
  const { inningsId, ballsPerOver: bpo, sequence, event, prevState, newState } =
    args;
  const base = {
    inningsId,
    sequence,
    overNumber: Math.floor(prevState.legalBalls / bpo),
    ballInOver: (prevState.legalBalls % bpo) + 1,
    idempotencyKey: args.idempotencyKey ?? null,
    createdById: args.createdById ?? null,
  };

  switch (event.kind) {
    case "delivery": {
      const p = newState.deliveries[newState.deliveries.length - 1];
      return {
        ...base,
        overNumber: p.overNumber,
        ballInOver: p.ballInOver,
        bowlerId: p.bowlerId,
        strikerId: p.strikerId,
        nonStrikerId: p.nonStrikerId,
        runsOffBat: p.runsOffBat,
        extraType: p.extraType,
        extraRuns: p.extraRuns,
        batRunsAreBoundary: event.batRunsAreBoundary ?? null,
        extrasAreBoundary: event.extrasAreBoundary ?? false,
        isLegal: p.isLegal,
        isFreeHit: p.isFreeHit,
        isNonBall: false,
        commentary: event.commentary ?? null,
        wicket: p.wicket
          ? {
              create: {
                type: p.wicket.type,
                dismissedPlayerId: p.wicket.dismissedPlayerId,
                bowlerCredited:
                  p.wicket.bowlerCredited ??
                  BOWLER_CREDITED_TYPES.has(p.wicket.type),
                fielderId: p.wicket.fielderId ?? null,
                assistFielderId: p.wicket.assistFielderId ?? null,
                directHit: p.wicket.directHit ?? false,
                battersCrossed: p.wicket.battersCrossed ?? false,
                endWhereOut: p.wicket.endWhereOut,
                newBatterId: event.newBatterId ?? null,
                notes: p.wicket.notes ?? null,
                wicketNumber: p.wicketsAfter,
                scoreAtFall: p.totalAfter,
                overBall: p.overBall,
              },
            }
          : undefined,
      };
    }
    case "penalty":
      return {
        ...base,
        runsOffBat: 0,
        extraType: "PENALTY",
        extraRuns: event.runs,
        isLegal: false,
        isFreeHit: false,
        isNonBall: true,
        commentary: event.reason ?? null,
      };
    case "retirement": {
      const end =
        prevState.strikerId === event.playerId
          ? "STRIKER_END"
          : "NON_STRIKER_END";
      return {
        ...base,
        runsOffBat: 0,
        extraRuns: 0,
        isLegal: false,
        isFreeHit: false,
        isNonBall: true,
        commentary: null,
        wicket: {
          create: {
            type: event.type,
            dismissedPlayerId: event.playerId,
            bowlerCredited: false,
            endWhereOut: end,
            newBatterId: event.newBatterId ?? null,
            notes: event.notes ?? null,
            wicketNumber: newState.wickets,
            scoreAtFall: newState.totalRuns,
            overBall: `${Math.floor(prevState.legalBalls / bpo)}.${prevState.legalBalls % bpo}`,
          },
        },
      };
    }
    case "swapEnds":
      return {
        ...base,
        runsOffBat: 0,
        extraRuns: 0,
        isLegal: false,
        isFreeHit: false,
        isNonBall: true,
        commentary: "strike corrected by scorer",
      };
  }
}
