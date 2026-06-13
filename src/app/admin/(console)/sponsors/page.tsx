import { listSponsorsAndAds } from "@/server/queries/admin-entities";
import { SponsorsScreen } from "@/components/admin/sponsors/sponsors-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sponsors & Ads — Fiesta Admin" };

export default async function AdminSponsorsPage() {
  const { sponsors, ads } = await listSponsorsAndAds();
  return (
    <SponsorsScreen
      sponsors={sponsors.map((s) => ({
        id: s.id,
        name: s.name,
        tier: s.tier,
        websiteUrl: s.websiteUrl,
        logoUrl: s.logoUrl,
        status: s.status,
      }))}
      ads={ads.map((a) => ({
        id: a.id,
        placement: a.placement,
        imageUrl: a.imageUrl,
        clickUrl: a.clickUrl,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        rotationWeight: a.rotationWeight,
        isActive: a.isActive,
        impressions: a.impressions,
        sponsorName: a.sponsor.name,
      }))}
    />
  );
}
