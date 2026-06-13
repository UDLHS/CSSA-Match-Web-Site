import { z } from "zod";
import { hexColorSchema, idSchema, teamColorSchema, text, urlSchema } from "./common";

export const teamStatusSchema = z.enum(["ACTIVE", "PENDING", "SUSPENDED"]);

export const teamCreateSchema = z.object({
  name: text(2, 60),
  shortName: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{2,4}$/i, "2–4 letters/digits")
    .transform((s) => s.toUpperCase()),
  logoUrl: urlSchema.nullish(),
  primaryColor: teamColorSchema,
  // secondary is decorative (never behind text) — plain hex is enough
  secondaryColor: hexColorSchema.nullish(),
  homeVenueId: idSchema.nullish(),
  captainId: idSchema.nullish(),
  coach: text(2, 80).nullish(),
  groupName: text(1, 30).nullish(),
  foundedYear: z.number().int().min(1900).max(2100).nullish(),
  status: teamStatusSchema.default("ACTIVE"),
  bio: text(0, 1000).nullish(),
});

export const teamUpdateSchema = teamCreateSchema.partial().extend({
  id: idSchema,
});

export type TeamCreateInput = z.infer<typeof teamCreateSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;
