import { TeamForm } from "@/components/admin/teams/team-form";
import { venueOptions } from "@/server/queries/admin-entities";

export const dynamic = "force-dynamic";

export const metadata = { title: "New team — Fiesta Admin" };

export default async function NewTeamPage() {
  const venues = await venueOptions();
  return <TeamForm venues={venues} />;
}
