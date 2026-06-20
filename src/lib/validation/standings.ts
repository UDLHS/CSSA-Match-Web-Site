import { z } from "zod";
import { idSchema, text } from "./common";

export const standingStatusSchema = z.enum(["NONE", "QUALIFIED", "ELIMINATED"]);

/**
 * Admin-entered points-table fields. P/W/L/NR — and points/NRR themselves —
 * are auto-computed from completed matches; this schema only covers what has
 * no automatic source (group, qualification badge) plus the optional
 * pointsOverride/nrrOverride pins. Omit/null an override to fall back to the
 * auto-computed value.
 */
export const standingUpsertSchema = z.object({
  seasonId: idSchema,
  teamId: idSchema,
  groupName: text(1, 40).nullish(),
  pointsOverride: z.number().int().min(0).max(9999).nullish(),
  nrrOverride: z.number().min(-99).max(99).nullish(),
  status: standingStatusSchema.default("NONE"),
  sortHint: z.number().int().min(0).max(9999).default(0),
});

export type StandingUpsertInput = z.infer<typeof standingUpsertSchema>;

/** CSV squad import — raw text the admin pasted or uploaded. */
export const squadImportSchema = z.object({
  csv: z.string().trim().min(1, "Paste or upload a CSV first").max(500_000),
});

export type SquadImportInput = z.infer<typeof squadImportSchema>;
