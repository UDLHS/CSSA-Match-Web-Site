import { prisma } from "@/lib/db";
import { VotesScreen } from "@/components/admin/votes/votes-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Popular votes — Fiesta Admin" };

export default async function PopularVotesPage() {
  const players = await prisma.player.findMany({
    where: { deletedAt: null },
    include: {
      team: { select: { id: true, name: true, shortName: true, logoUrl: true, primaryColor: true } },
      popularVote: { select: { votes: true } },
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <VotesScreen
      rows={players.map((p) => ({
        playerId: p.id,
        name: p.fullName,
        photoUrl: p.photoUrl,
        role: p.role,
        votes: p.popularVote?.votes ?? 0,
        team: p.team,
      }))}
    />
  );
}
