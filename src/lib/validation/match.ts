import { z } from "zod";
import { idSchema, text } from "./common";

export const matchFormatSchema = z.enum(["T10", "T20", "ODI", "CUSTOM"]);
export const tossDecisionSchema = z.enum(["BAT", "BOWL"]);

export const matchCreateSchema = z
  .object({
    seasonId: idSchema,
    matchNumber: z.number().int().min(1).max(999),
    stage: text(2, 60).nullish(),
    groupName: text(1, 30).nullish(),
    format: matchFormatSchema.default("T20"),
    oversPerSide: z.number().int().min(1).max(50).default(20),
    ballsPerOver: z.number().int().min(4).max(10).default(6),
    playersPerSide: z.number().int().min(2).max(11).default(11),
    scheduledAt: z.coerce.date(),
    venueId: idSchema.nullish(),
    homeTeamId: idSchema,
    awayTeamId: idSchema,
    umpire1: text(2, 80).nullish(),
    umpire2: text(2, 80).nullish(),
    thirdUmpire: text(2, 80).nullish(),
    assignedScorerId: z.string().uuid().nullish(),
    notes: text(0, 1000).nullish(),
  })
  .refine((m) => m.homeTeamId !== m.awayTeamId, {
    message: "A team cannot play itself",
    path: ["awayTeamId"],
  });

export const matchUpdateSchema = z.object({
  id: idSchema,
  stage: text(2, 60).nullish().optional(),
  groupName: text(1, 30).nullish().optional(),
  format: matchFormatSchema.optional(),
  oversPerSide: z.number().int().min(1).max(50).optional(),
  ballsPerOver: z.number().int().min(4).max(10).optional(),
  playersPerSide: z.number().int().min(2).max(11).optional(),
  scheduledAt: z.coerce.date().optional(),
  venueId: idSchema.nullish().optional(),
  umpire1: text(2, 80).nullish().optional(),
  umpire2: text(2, 80).nullish().optional(),
  thirdUmpire: text(2, 80).nullish().optional(),
  assignedScorerId: z.string().uuid().nullish().optional(),
  notes: text(0, 1000).nullish().optional(),
});

export const playingXISchema = z
  .object({
    matchId: idSchema,
    teamId: idSchema,
    players: z
      .array(
        z.object({
          playerId: idSchema,
          battingOrder: z.number().int().min(1).max(11),
          isKeeper: z.boolean().default(false),
        }),
      )
      .min(2)
      .max(11),
  })
  .superRefine((xi, ctx) => {
    const ids = new Set(xi.players.map((p) => p.playerId));
    if (ids.size !== xi.players.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate player in the XI",
        path: ["players"],
      });
    }
    const orders = new Set(xi.players.map((p) => p.battingOrder));
    if (orders.size !== xi.players.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate batting order in the XI",
        path: ["players"],
      });
    }
    if (xi.players.filter((p) => p.isKeeper).length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one wicket-keeper per XI",
        path: ["players"],
      });
    }
  });

export const tossSchema = z.object({
  matchId: idSchema,
  tossWonByTeamId: idSchema,
  decision: tossDecisionSchema,
});

export const startInningsSchema = z
  .object({
    matchId: idSchema,
    inningsNumber: z.number().int().min(1).max(4),
    battingTeamId: idSchema,
    openingStrikerId: idSchema,
    openingNonStrikerId: idSchema,
  })
  .refine((i) => i.openingStrikerId !== i.openingNonStrikerId, {
    message: "Opening striker and non-striker must be different players",
    path: ["openingNonStrikerId"],
  });

export const endInningsSchema = z.object({
  inningsId: idSchema,
  reason: z.enum(["DECLARED", "MANUAL"]),
});

export const completeMatchSchema = z.object({
  matchId: idSchema,
  resultText: text(3, 200).nullish(),
  winnerTeamId: idSchema.nullish(),
  playerOfMatchId: idSchema.nullish(),
});

export const abandonMatchSchema = z.object({
  matchId: idSchema,
  reason: text(3, 200),
});

export type MatchCreateInput = z.infer<typeof matchCreateSchema>;
export type MatchUpdateInput = z.infer<typeof matchUpdateSchema>;
export type PlayingXIInput = z.infer<typeof playingXISchema>;
export type TossInput = z.infer<typeof tossSchema>;
export type StartInningsInput = z.infer<typeof startInningsSchema>;
export type EndInningsInput = z.infer<typeof endInningsSchema>;
export type CompleteMatchInput = z.infer<typeof completeMatchSchema>;
export type AbandonMatchInput = z.infer<typeof abandonMatchSchema>;
