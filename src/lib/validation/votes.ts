import { z } from "zod";
import { idSchema, text } from "./common";

/**
 * Popularity is ADMIN-SET only (never user-voted). The note lands in the
 * audit log — design-spec requires a reason on every vote override.
 */
export const setVotesSchema = z.object({
  playerId: idSchema,
  votes: z.number().int().min(0).max(1_000_000),
  note: text(3, 300),
});

export type SetVotesInput = z.infer<typeof setVotesSchema>;
