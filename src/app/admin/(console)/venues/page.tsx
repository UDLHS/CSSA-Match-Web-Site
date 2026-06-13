import { listAdminVenues } from "@/server/queries/admin-entities";
import { VenuesScreen } from "@/components/admin/venues/venues-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Venues — Fiesta Admin" };

export default async function AdminVenuesPage() {
  const venues = await listAdminVenues();
  return (
    <VenuesScreen
      venues={venues.map((v) => ({
        id: v.id,
        name: v.name,
        location: v.location,
        capacity: v.capacity,
        pitchType: v.pitchType,
        notes: v.notes,
        isAvailable: v.isAvailable,
        matches: v._count.matches,
      }))}
    />
  );
}
