import { LiveHero } from "@/components/public/live-hero";
import { MatchesCarousel } from "@/components/public/matches-carousel";
import { LeaderboardPreview } from "@/components/public/leaderboard-preview";
import { StandingsTable } from "@/components/public/standings-table";
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
  getPublicStandings,
  listMatchCards,
} from "@/server/queries/public";
import { getActiveAd } from "@/server/queries/ads";

/** Live data on every request — the hero then short-polls client-side. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const season = await getActiveSeason();
  const [featured, previous, live, upcoming, batting, bowling, overall, popular, standings, bannerAd, skyscraperAd] =
    await Promise.all([
      getFeaturedMatchSnapshot(),
      listMatchCards("previous"),
      listMatchCards("live"),
      listMatchCards("upcoming"),
      season ? getLeaderboard(season.id, "BATTING") : null,
      season ? getLeaderboard(season.id, "BOWLING") : null,
      season ? getLeaderboard(season.id, "OVERALL") : null,
      getPopularPlayers(7),
      season ? getPublicStandings(season.id) : Promise.resolve([]),
      getActiveAd("HOME_LEADERBOARD_BANNER"),
      getActiveAd("HOME_SKYSCRAPER"),
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
      {/* Only rendered when a creative is live — no empty placeholder. */}
      {bannerAd && <AdSlot placement="HOME_LEADERBOARD_BANNER" variant="leaderboard" ad={bannerAd} />}
      <MatchesCarousel
        previous={previous as LiveSnapshotRead[]}
        live={live as LiveSnapshotRead[]}
        upcoming={upcoming as LiveSnapshotRead[]}
      />
      {/* Desktop: leaderboard / popular split, with a skyscraper column ONLY
          when there's a live ad (otherwise no reserved gap). Mobile stacks. */}
      <div
        className={`grid max-lg:grid-cols-1 ${skyscraperAd ? "lg:grid-cols-[5fr_176px_7fr]" : "lg:grid-cols-[5fr_7fr]"}`}
        style={{ gap: 20, alignItems: "stretch" }}
      >
        <div style={{ alignSelf: "start" }}>
          <LeaderboardPreview
            batting={(batting?.payload as LbBattingRow[]) ?? []}
            bowling={(bowling?.payload as LbBowlingRow[]) ?? []}
            overall={(overall?.payload as LbOverallRow[]) ?? []}
          />
        </div>
        {skyscraperAd && (
          <div className="max-lg:hidden">
            <AdSlot placement="HOME_SKYSCRAPER" variant="skyscraper" ad={skyscraperAd} />
          </div>
        )}
        {bannerAd && (
          <div className="lg:hidden">
            <AdSlot placement="HOME_LEADERBOARD_BANNER" variant="banner" ad={bannerAd} />
          </div>
        )}
        <div style={{ alignSelf: "start" }}>
          <PopularPlayers rows={popularRows} />
        </div>
      </div>

      {/* Team points table — below the leaderboard, scrollable so a long table
          (many groups/teams) never stretches the page. */}
      {standings.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="t-h2">Team standings</h2>
          <div style={{ maxHeight: "clamp(320px, 52dvh, 560px)", overflowY: "auto" }}>
            <StandingsTable groups={standings} />
          </div>
        </section>
      )}
    </div>
  );
}
