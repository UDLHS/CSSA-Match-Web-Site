import { z } from "zod";
import { idSchema, text } from "./common";

export const venueCreateSchema = z.object({
  name: text(2, 80),
  location: text(2, 120),
  capacity: z.number().int().min(0).max(200000).nullish(),
  pitchType: text(2, 40).nullish(),
  notes: text(0, 500).nullish(),
  isAvailable: z.boolean().default(true),
});

export const venueUpdateSchema = venueCreateSchema.partial().extend({
  id: idSchema,
});

export type VenueCreateInput = z.infer<typeof venueCreateSchema>;
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;
