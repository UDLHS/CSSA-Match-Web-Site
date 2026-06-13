import { notFound } from "next/navigation";
import {
  activeSeasonId,
  listAdminTeams,
  venueOptions,
} from "@/server/queries/admin-entities";
import { MatchCreateForm } from "@/components/admin/matches/match-create-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Create match — Fiesta Admin" };

export default async function NewMatchPage() {
  const [seasonId, teams, venues] = await Promise.all([
    activeSeasonId(),
    listAdminTeams(),
    venueOptions(),
  ]);
  if (!seasonId) notFound();

  return (
    <MatchCreateForm
      seasonId={seasonId}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      venues={venues}
    />
  );
}
