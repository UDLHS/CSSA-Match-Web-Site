import { notFound } from "next/navigation";
import {
  activeSeasonId,
  listAdminTeams,
  venueOptions,
  nextMatchNumber,
} from "@/server/queries/admin-entities";
import { MatchCreateForm } from "@/components/admin/matches/match-create-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create match — Fiesta Admin" };

export default async function NewMatchPage() {
  const seasonId = await activeSeasonId();
  if (!seasonId) notFound();

  const [teams, venues, nextNumber] = await Promise.all([
    listAdminTeams(),
    venueOptions(),
    nextMatchNumber(seasonId),
  ]);

  return (
    <MatchCreateForm
      seasonId={seasonId}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      venues={venues}
      defaultMatchNumber={nextNumber}
    />
  );
}
