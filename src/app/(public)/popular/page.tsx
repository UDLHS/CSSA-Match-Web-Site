import { PopularPlayers } from "@/components/public/popular-players";
import type { PopularRow } from "@/lib/leaderboard-types";
import { getPopularPlayers } from "@/server/queries/public";

export const revalidate = 60;

export const metadata = { title: "Popular players — Cricket Fiesta '26" };

export default async function PopularPage() {
  const votes = await getPopularPlayers(50);
  const rows: PopularRow[] = votes.map((v, i) => ({
    rank: i + 1,
    playerId: v.playerId,
    name: v.player.fullName,
    photoUrl: v.player.photoUrl,
    role: v.player.role,
    team: v.player.team,
    votes: v.votes,
  }));

  return (
    <div
      style={{
        padding: "clamp(14px, 2.5vw, 24px) clamp(14px, 3vw, 32px) 36px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        maxWidth: 1100,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <PopularPlayers rows={rows} />
      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
        Vote counts are set by the tournament committee — this is the official
        popularity ranking, not a public poll.
      </p>
    </div>
  );
}
