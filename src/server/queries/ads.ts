import type { AdPlacement } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Public ad serving — active creative for a placement, weighted rotation. */
export interface ActiveAd {
  id: string;
  imageUrl: string;
  clickUrl: string;
  sponsorName: string;
}

export async function getActiveAd(
  placement: AdPlacement,
): Promise<ActiveAd | null> {
  const now = new Date();
  const ads = await prisma.adCreative.findMany({
    where: {
      placement,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      sponsor: { status: "ACTIVE" },
    },
    include: { sponsor: { select: { name: true } } },
  });
  if (ads.length === 0) return null;

  // Weighted pick by rotationWeight so heavier creatives show more often.
  const total = ads.reduce((s, a) => s + Math.max(a.rotationWeight, 1), 0);
  let r = Math.random() * total;
  const chosen = ads.find((a) => (r -= Math.max(a.rotationWeight, 1)) < 0) ?? ads[0];
  return {
    id: chosen.id,
    imageUrl: chosen.imageUrl,
    clickUrl: chosen.clickUrl,
    sponsorName: chosen.sponsor.name,
  };
}

/** Active sponsors for the footer partners strip, title tier first. */
export async function getFooterPartners() {
  return prisma.sponsor.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, logoUrl: true, websiteUrl: true, tier: true },
    orderBy: { tier: "asc" },
  });
}
