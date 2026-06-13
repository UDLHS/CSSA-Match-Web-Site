import { z } from "zod";
import { idSchema, text, urlSchema } from "./common";

export const sponsorTierSchema = z.enum([
  "TITLE",
  "CO_SPONSOR",
  "MEDIA_PARTNER",
  "BEVERAGE_PARTNER",
  "PARTNER",
]);

export const sponsorStatusSchema = z.enum(["ACTIVE", "PENDING", "ARCHIVED"]);

export const adPlacementSchema = z.enum([
  "HOME_LEADERBOARD_BANNER",
  "HOME_SKYSCRAPER",
  "MATCH_INFEED_BANNER",
  "LEADERBOARD_BANNER",
  "FOOTER_PARTNERS",
]);

export const sponsorCreateSchema = z.object({
  name: text(2, 80),
  tier: sponsorTierSchema.default("PARTNER"),
  websiteUrl: urlSchema.nullish(),
  logoUrl: urlSchema.nullish(),
  status: sponsorStatusSchema.default("PENDING"),
});

export const sponsorUpdateSchema = sponsorCreateSchema.partial().extend({
  id: idSchema,
});

export const adCreateSchema = z
  .object({
    sponsorId: idSchema,
    placement: adPlacementSchema,
    imageUrl: urlSchema,
    clickUrl: urlSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    rotationWeight: z.number().int().min(1).max(100).default(1),
    isActive: z.boolean().default(false),
  })
  .refine((a) => a.endDate >= a.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export const adUpdateSchema = z.object({
  id: idSchema,
  placement: adPlacementSchema.optional(),
  imageUrl: urlSchema.optional(),
  clickUrl: urlSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  rotationWeight: z.number().int().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type SponsorCreateInput = z.infer<typeof sponsorCreateSchema>;
export type SponsorUpdateInput = z.infer<typeof sponsorUpdateSchema>;
export type AdCreateInput = z.infer<typeof adCreateSchema>;
export type AdUpdateInput = z.infer<typeof adUpdateSchema>;
