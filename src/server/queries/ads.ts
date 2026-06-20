import { unstable_cache } from "next/cache";
import type { AdPlacement } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TAG, TTL } from "@/server/cache";

/** Public ad serving — active creative for a placement, weighted rotation. */
export interface ActiveAd {
  id: string;
  imageUrl: string;
  clickUrl: string;
  sponsorName: string;
}

export const getActiveAd = unstable_cache(
  async (placement: AdPlacement): Promise<ActiveAd | null> => {
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
    // (Frozen for the cache window — rotation happens per TTL, not per view.)
    const total = ads.reduce((s, a) => s + Math.max(a.rotationWeight, 1), 0);
    let r = Math.random() * total;
    const chosen = ads.find((a) => (r -= Math.max(a.rotationWeight, 1)) < 0) ?? ads[0];
    return {
      id: chosen.id,
      imageUrl: chosen.imageUrl,
      clickUrl: chosen.clickUrl,
      sponsorName: chosen.sponsor.name,
    };
  },
  ["public:getActiveAd"],
  { revalidate: TTL.slow, tags: [TAG.sponsors] },
);

/** Active sponsors for the footer partners strip, title tier first. */
export const getFooterPartners = unstable_cache(
  async () => {
    return prisma.sponsor.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, logoUrl: true, websiteUrl: true, tier: true },
      orderBy: { tier: "asc" },
    });
  },
  ["public:getFooterPartners"],
  { revalidate: TTL.slow, tags: [TAG.sponsors] },
);
