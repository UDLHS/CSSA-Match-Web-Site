import { notFound } from "next/navigation";
import Link from "next/link";
import { PlayerForm } from "@/components/admin/players/player-form";
import { getPlayerForEdit, listAdminTeams } from "@/server/queries/admin-entities";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [player, teams] = await Promise.all([getPlayerForEdit(id), listAdminTeams()]);
  if (!player) notFound();

  return (
    <>
      <Link href="/admin/players" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
        ← All players
      </Link>
      <PlayerForm
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        init={{
          id: player.id,
          fullName: player.fullName,
          teamId: player.teamId ?? "",
          jerseyNumber: player.jerseyNumber?.toString() ?? "",
          role: player.role,
          battingStyle: player.battingStyle,
          bowlingStyle: player.bowlingStyle,
          isCaptain: player.isCaptain,
          status: player.status,
          bio: player.bio ?? "",
          votes: player.popularVote?.votes ?? 0,
        }}
      />
    </>
  );
}
