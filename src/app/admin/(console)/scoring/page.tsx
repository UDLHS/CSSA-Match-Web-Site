import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHead, EmptyState } from "@/components/admin/kit";
import { StatusBadge } from "@/components/public/atoms";
import { Icon, IC } from "@/components/public/icons";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Live Scoring — Fiesta Admin" };

export default async function ScoringIndexPage() {
  const matches = await prisma.match.findMany({
    where: {
      deletedAt: null,
      status: { in: ["UPCOMING", "LIVE", "INNINGS_BREAK"] },
    },
    include: { matchTeams: { include: { team: true } }, venue: true },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
  });

  return (
    <>
      <PageHead title="Live scoring" sub="Pick a match to open its scoring console" />
      {matches.length === 0 ? (
        <EmptyState
          icon={IC.bolt}
          title="No matches ready to score"
          sub="Publish and start a match from the Matches screen first."
          action={
            <Link href="/admin/matches" className="btn btn-soft btn-sm" style={{ textDecoration: "none" }}>
              Go to Matches
            </Link>
          }
        />
      ) : (
        <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 14 }}>
          {matches.map((m) => {
            const home = m.matchTeams.find((mt) => mt.isHome)?.team;
            const away = m.matchTeams.find((mt) => !mt.isHome)?.team;
            const live = m.status === "LIVE" || m.status === "INNINGS_BREAK";
            return (
              <Link
                key={m.id}
                href={`/admin/scoring/${m.id}`}
                className="card"
                style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, textDecoration: "none", color: "inherit" }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <StatusBadge status={m.status as "LIVE" | "UPCOMING" | "INNINGS_BREAK"} />
                  <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Match {m.matchNumber}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>
                  {home?.name ?? "?"} vs {away?.name ?? "?"}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {fmtDateTime(m.scheduledAt.toISOString())}{m.venue ? ` · ${m.venue.name}` : ""}
                </span>
                <span className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                  <Icon d={IC.bolt} size={14} /> {live ? "Resume scoring" : "Start scoring"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
