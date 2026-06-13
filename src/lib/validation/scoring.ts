import { z } from "zod";
import { idSchema, text } from "./common";

/** WIDE/NO_BALL/BYE/LEG_BYE on a ball — PENALTY is a separate event. */
export const ballExtraTypeSchema = z.enum([
  "WIDE",
  "NO_BALL",
  "BYE",
  "LEG_BYE",
]);

/** Dismissals recordable ON a delivery (retirements use their own action). */
export const deliveryWicketTypeSchema = z.enum([
  "BOWLED",
  "CAUGHT",
  "CAUGHT_AND_BOWLED",
  "LBW",
  "RUN_OUT",
  "STUMPED",
  "HIT_WICKET",
  "OBSTRUCTING_FIELD",
  "HIT_BALL_TWICE",
  "OTHER",
]);

export const wicketInputSchema = z.object({
  type: deliveryWicketTypeSchema,
  dismissedPlayerId: idSchema,
  bowlerCredited: z.boolean().optional(),
  fielderId: idSchema.nullish(),
  assistFielderId: idSchema.nullish(),
  directHit: z.boolean().optional(),
  battersCrossed: z.boolean().optional(),
  notes: text(0, 300).nullish(),
});

/**
 * One ball from the scoring console. `idempotencyKey` is client-generated
 * per tap — replays of the same tap are detected, not double-recorded.
 * `expectedSequence` is the sequence number the client believes this ball
 * will get; a mismatch means another scorer got there first (409).
 */
export const recordDeliverySchema = z.object({
  inningsId: idSchema,
  idempotencyKey: z.string().min(8).max(100),
  expectedSequence: z.number().int().min(1).optional(),
  bowlerId: idSchema,
  runsOffBat: z.number().int().min(0).max(10).default(0),
  extraType: ballExtraTypeSchema.nullish(),
  extraRuns: z.number().int().min(0).max(10).optional(),
  batRunsAreBoundary: z.boolean().optional(),
  extrasAreBoundary: z.boolean().optional(),
  wicket: wicketInputSchema.nullish(),
  newBatterId: idSchema.nullish(),
  commentary: text(0, 280).nullish(),
});

export const recordPenaltySchema = z.object({
  inningsId: idSchema,
  idempotencyKey: z.string().min(8).max(100),
  runs: z.number().int().min(1).max(10),
  reason: text(0, 200).nullish(),
});

export const recordRetirementSchema = z.object({
  inningsId: idSchema,
  idempotencyKey: z.string().min(8).max(100),
  playerId: idSchema,
  type: z.enum(["RETIRED_HURT", "RETIRED_OUT"]),
  newBatterId: idSchema.nullish(),
  notes: text(0, 300).nullish(),
});

/** Admin correction — swap which batter is on strike. */
export const swapStrikeSchema = z.object({
  inningsId: idSchema,
  idempotencyKey: z.string().min(8).max(100),
});

export const undoLastEventSchema = z.object({
  inningsId: idSchema,
});

/**
 * Replace the delivery event at `sequence` and replay everything after it
 * (backend-spec "Undo / edit": deterministic replay, never patch in place).
 */
export const editDeliverySchema = z.object({
  inningsId: idSchema,
  sequence: z.number().int().min(1),
  replacement: recordDeliverySchema.omit({
    inningsId: true,
    idempotencyKey: true,
    expectedSequence: true,
  }),
});

export type RecordDeliveryInput = z.infer<typeof recordDeliverySchema>;
export type RecordPenaltyInput = z.infer<typeof recordPenaltySchema>;
export type RecordRetirementInput = z.infer<typeof recordRetirementSchema>;
export type SwapStrikeInput = z.infer<typeof swapStrikeSchema>;
export type UndoLastEventInput = z.infer<typeof undoLastEventSchema>;
export type EditDeliveryInput = z.infer<typeof editDeliverySchema>;
