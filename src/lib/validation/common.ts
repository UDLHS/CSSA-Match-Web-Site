import { z } from "zod";
import { contrastRatio } from "@/lib/color";

/** Prisma cuid ids ("cm…"); also accepts cuid2 for forward-compat. */
export const idSchema = z.string().min(8).max(40).regex(/^[a-z0-9]+$/i, {
  message: "Invalid id",
});

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-f]{6})$/i, "Use a 6-digit hex color like #4338ca");

export { contrastRatio } from "@/lib/color";

/**
 * Team colors sit behind white monogram/jersey text (TeamLogo,
 * AvatarInitials) — the Team form blocks anything under 4.5:1
 * (design-spec "automatic 4.5:1 contrast check").
 */
export const teamColorSchema = hexColorSchema.refine(
  (hex) => contrastRatio(hex, "#ffffff") >= 4.5,
  {
    message:
      "Color fails the 4.5:1 contrast check against white text — pick a darker shade",
  },
);

export const urlSchema = z.string().url().max(2048);

/** Trimmed human-entered text with a length window. */
export const text = (min: number, max: number) =>
  z.string().trim().min(min).max(max);
