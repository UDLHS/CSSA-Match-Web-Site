import { LiveHero } from "@/components/public/live-hero";
import { MatchesCarousel } from "@/components/public/matches-carousel";
import { LeaderboardPreview } from "@/components/public/leaderboard-preview";
import { PopularPlayers } from "@/components/public/popular-players";
import { AdSlot } from "@/components/public/ad-slot";
import { HomeTicker } from "@/components/public/home-ticker";
import type { LiveSnapshotRead } from "@/lib/live-types";
import type {
  LbBattingRow,
  LbBowlingRow,
  LbOverallRow,
  PopularRow,
} from "@/lib/leaderboard-types";
import {
  getActiveSeason,
  getFeaturedMatchSnapshot,
  getLeaderboard,
  getPopularPlayers,
  listMatchCards,
} from "@/server/queries/public";

/** Live data on every request — the hero then short-polls client-side. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const season = await getActiveSeason();
  const [featured, previous, live, upcoming, batting, bowling, overall, popular] =
    await Promise.all([
      getFeaturedMatchSnapshot(),
      listMatchCards("previous"),
      listMatchCards("live"),
      listMatchCards("upcoming"),
      season ? getLeaderboard(season.id, "BATTING") : null,
      season ? getLeaderboard(season.id, "BOWLING") : null,
      season ? getLeaderboard(season.id, "OVERALL") : null,
      getPopularPlayers(7),
    ]);

  const popularRows: PopularRow[] = popular.map((v, i) => ({
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
        padding: "clamp(14px, 2.5vw, 24px) clamp(14px, 3vw, 32px) 32px",
        display: "flex",
        flexDirection: "column",
        gap: 26,
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <HomeTicker />
      <LiveHero initial={featured as LiveSnapshotRead | null} />
      <AdSlot placement="HOME_LEADERBOARD_BANNER" variant="leaderboard" />
      <MatchesCarousel
        previous={previous as LiveSnapshotRead[]}
        live={live as LiveSnapshotRead[]}
        upcoming={upcoming as LiveSnapshotRead[]}
      />
      {/* Desktop: leaderboard 5 / skyscraper / popular 7 split; mobile stacks */}
      <div
        className="grid max-lg:grid-cols-1 lg:grid-cols-[5fr_176px_7fr]"
        style={{ gap: 20, alignItems: "stretch" }}
      >
        <div style={{ alignSelf: "start" }}>
          <LeaderboardPreview
            batting={(batting?.payload as LbBattingRow[]) ?? []}
            bowling={(bowling?.payload as LbBowlingRow[]) ?? []}
            overall={(overall?.payload as LbOverallRow[]) ?? []}
          />
        </div>
        <div className="max-lg:hidden">
          <AdSlot placement="HOME_SKYSCRAPER" variant="skyscraper" />
        </div>
        <div className="lg:hidden">
          <AdSlot placement="HOME_LEADERBOARD_BANNER" variant="banner" />
        </div>
        <div style={{ alignSelf: "start" }}>
          <PopularPlayers rows={popularRows} />
        </div>
      </div>
    </div>
  );
}
