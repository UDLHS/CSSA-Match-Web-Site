import type { AdPlacement } from "@prisma/client";
import { getActiveAd } from "@/server/queries/ads";
import { SponsorSlot } from "./atoms";
import { AdImpression } from "./ad-impression";

type SlotVariant = "leaderboard" | "skyscraper" | "banner";

/**
 * Server component: serves the active creative for a placement, or falls back
 * to the "your brand here" placeholder. Impressions are counted client-side
 * via a beacon so the public render path stays a pure read.
 */
export async function AdSlot({
  placement,
  variant,
}: {
  placement: AdPlacement;
  variant: SlotVariant;
}) {
  const ad = await getActiveAd(placement);
  if (!ad) return <SponsorSlot variant={variant} />;

  const height = variant === "leaderboard" ? 104 : variant === "banner" ? 90 : undefined;

  return (
    <a
      href={ad.clickUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={`Sponsor: ${ad.sponsorName}`}
      style={{
        display: "block",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        height: variant === "skyscraper" ? "100%" : height,
        minHeight: height,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.imageUrl}
        alt={ad.sponsorName}
        style={{ width: "100%", height: "100%", objectFit: variant === "skyscraper" ? "cover" : "contain", display: "block" }}
      />
      <AdImpression adId={ad.id} />
    </a>
  );
}
