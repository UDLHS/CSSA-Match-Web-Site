import { MatchesList } from "@/components/public/matches-list";
import { PageTicker } from "@/components/public/home-ticker";
import type { LiveSnapshotRead } from "@/lib/live-types";
import { listMatchCards } from "@/server/queries/public";

export const dynamic = "force-dynamic";

export const metadata = { title: "Matches — Cricket Fiesta '26" };

export default async function MatchesPage() {
  const [live, upcoming, previous] = await Promise.all([
    listMatchCards("live"),
    listMatchCards("upcoming"),
    listMatchCards("previous"),
  ]);

  return (
    <div
      style={{
        padding: "clamp(14px, 2.5vw, 24px) clamp(14px, 3vw, 32px) 36px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <PageTicker intervalMs={4000} />
      <h1 className="t-display">Matches</h1>
      <MatchesList
        live={live as LiveSnapshotRead[]}
        upcoming={upcoming as LiveSnapshotRead[]}
        previous={previous as LiveSnapshotRead[]}
      />
    </div>
  );
}
