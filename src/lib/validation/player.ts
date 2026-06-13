import { z } from "zod";
import { idSchema, text, urlSchema } from "./common";

export const playerRoleSchema = z.enum([
  "BATTER",
  "BOWLER",
  "ALL_ROUNDER",
  "WICKET_KEEPER",
]);

export const battingStyleSchema = z.enum(["RIGHT_HAND", "LEFT_HAND"]);

export const bowlingStyleSchema = z.enum([
  "RIGHT_ARM_FAST",
  "RIGHT_ARM_MEDIUM",
  "RIGHT_ARM_OFF_SPIN",
  "RIGHT_ARM_LEG_SPIN",
  "LEFT_ARM_FAST",
  "LEFT_ARM_MEDIUM",
  "LEFT_ARM_ORTHODOX",
  "LEFT_ARM_WRIST_SPIN",
  "NONE",
]);

export const playerStatusSchema = z.enum(["ACTIVE", "INJURED", "SUSPENDED"]);

export const playerCreateSchema = z.object({
  fullName: text(2, 80),
  teamId: idSchema.nullish(),
  jerseyNumber: z.number().int().min(0).max(999).nullish(),
  dateOfBirth: z.coerce.date().nullish(),
  photoUrl: urlSchema.nullish(),
  role: playerRoleSchema.default("BATTER"),
  battingStyle: battingStyleSchema.default("RIGHT_HAND"),
  bowlingStyle: bowlingStyleSchema.default("NONE"),
  isCaptain: z.boolean().default(false),
  squadOrder: z.number().int().min(1).max(30).nullish(),
  status: playerStatusSchema.default("ACTIVE"),
  bio: text(0, 1000).nullish(),
});

export const playerUpdateSchema = playerCreateSchema.partial().extend({
  id: idSchema,
});

export type PlayerCreateInput = z.infer<typeof playerCreateSchema>;
export type PlayerUpdateInput = z.infer<typeof playerUpdateSchema>;
