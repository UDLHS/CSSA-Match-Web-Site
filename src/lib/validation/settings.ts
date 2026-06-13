import { z } from "zod";
import { idSchema } from "./common";
import { matchFormatSchema } from "./match";

/** Mirrors PointsConfig in src/lib/scoring/stats.ts — single tweakable object. */
export const pointsConfigSchema = z.object({
  batting: z.object({
    perRun: z.number().min(-100).max(100),
    perFour: z.number().min(-100).max(100),
    perSix: z.number().min(-100).max(100),
    perFifty: z.number().min(-100).max(100),
    perHundred: z.number().min(-100).max(100),
  }),
  bowling: z.object({
    perWicket: z.number().min(-100).max(100),
    perRunConceded: z.number().min(-100).max(100),
    perMaiden: z.number().min(-100).max(100),
    economyBonus: z.object({
      atOrBelow: z.number().min(0).max(36),
      points: z.number().min(-100).max(100),
    }),
  }),
  fielding: z.object({
    perCatch: z.number().min(-100).max(100),
    perStumping: z.number().min(-100).max(100),
    perDirectHitRunOut: z.number().min(-100).max(100),
    perAssistedRunOut: z.number().min(-100).max(100),
  }),
});

export const settingsUpdateSchema = z.object({
  seasonId: idSchema,
  defaultFormat: matchFormatSchema.optional(),
  defaultOvers: z.number().int().min(1).max(50).optional(),
  defaultBallsPerOver: z.number().int().min(4).max(10).optional(),
  playersPerSide: z.number().int().min(2).max(11).optional(),
  superOverOnTie: z.boolean().optional(),
  pointsWin: z.number().int().min(0).max(10).optional(),
  pointsTie: z.number().int().min(0).max(10).optional(),
  pointsLoss: z.number().int().min(0).max(10).optional(),
  bonusPointEnabled: z.boolean().optional(),
  nrrTiebreak: z.boolean().optional(),
  pointsConfig: pointsConfigSchema.optional(),
  votingOpen: z.boolean().optional(),
  votingOpensAt: z.coerce.date().nullish().optional(),
  votingClosesAt: z.coerce.date().nullish().optional(),
  voteOnePerDevice: z.boolean().optional(),
  votesPublic: z.boolean().optional(),
});

export type PointsConfigInput = z.infer<typeof pointsConfigSchema>;
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
