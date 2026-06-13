import { PlayerForm } from "@/components/admin/players/player-form";
import { listAdminTeams } from "@/server/queries/admin-entities";

export const dynamic = "force-dynamic";

export const metadata = { title: "New player — Fiesta Admin" };

export default async function NewPlayerPage() {
  const teams = await listAdminTeams();
  return <PlayerForm teams={teams.map((t) => ({ id: t.id, name: t.name }))} />;
}
