import type { AdPlacement } from "@prisma/client";
import { getActiveAd, type ActiveAd } from "@/server/queries/ads";
import { AdImpression } from "./ad-impression";

type SlotVariant = "leaderboard" | "skyscraper" | "banner";

/**
 * Server component: renders the active creative for a placement, or NOTHING
 * when there is no ad (no "your brand here" placeholder — empty ad space stays
 * invisible to visitors). Pass a pre-fetched `ad` so the parent can also decide
 * layout (e.g. collapse a reserved column) without a second query.
 *
 * Ads appear/disappear live because the page's PageTicker re-renders
 * this server component every few seconds.
 */
export async function AdSlot({
  placement,
  variant,
  ad: provided,
}: {
  placement: AdPlacement;
  variant: SlotVariant;
  ad?: ActiveAd | null;
}) {
  const ad = provided !== undefined ? provided : await getActiveAd(placement);
  if (!ad) return null;

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
