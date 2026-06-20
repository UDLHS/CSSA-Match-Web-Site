import { z } from "zod";
import { idSchema, text } from "./common";

export const standingStatusSchema = z.enum(["NONE", "QUALIFIED", "ELIMINATED"]);

/**
 * Admin-entered points-table fields. P/W/L/NR are NOT here — they are derived
 * from completed matches at read time. Admin owns points, NRR, group and the
 * qualification badge.
 */
export const standingUpsertSchema = z.object({
  seasonId: idSchema,
  teamId: idSchema,
  groupName: text(1, 40).nullish(),
  points: z.number().int().min(0).max(9999),
  netRunRate: z.number().min(-99).max(99),
  status: standingStatusSchema.default("NONE"),
  sortHint: z.number().int().min(0).max(9999).default(0),
});

export const standingDeleteSchema = z.object({ id: idSchema });

export type StandingUpsertInput = z.infer<typeof standingUpsertSchema>;

/** CSV squad import — raw text the admin pasted or uploaded. */
export const squadImportSchema = z.object({
  csv: z.string().trim().min(1, "Paste or upload a CSV first").max(500_000),
});

export type SquadImportInput = z.infer<typeof squadImportSchema>;
