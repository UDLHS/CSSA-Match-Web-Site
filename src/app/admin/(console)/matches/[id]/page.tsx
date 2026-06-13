import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMatchForEdit,
  teamsWithSquads,
  venueOptions,
} from "@/server/queries/admin-entities";
import { MatchEditor } from "@/components/admin/matches/match-editor";

export const dynamic = "force-dynamic";

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [match, squads, venues] = await Promise.all([
    getMatchForEdit(id),
    teamsWithSquads(),
    venueOptions(),
  ]);
  if (!match) notFound();

  const home = match.matchTeams.find((mt) => mt.isHome)?.team ?? null;
  const away = match.matchTeams.find((mt) => !mt.isHome)?.team ?? null;
  const squadOf = (teamId?: string) =>
    squads.find((s) => s.id === teamId)?.players.map((p) => ({
      id: p.id,
      name: p.fullName,
      role: p.role,
      jersey: p.jerseyNumber,
    })) ?? [];

  const existingXI = match.playingXI.map((p) => ({
    teamId: p.teamId,
    playerId: p.playerId,
    battingOrder: p.battingOrder,
    isKeeper: p.isKeeper,
  }));

  return (
    <>
      <Link href="/admin/matches" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
        ← All matches
      </Link>
      <MatchEditor
        match={{
          id: match.id,
          matchNumber: match.matchNumber,
          status: match.status,
          format: match.format,
          oversPerSide: match.oversPerSide,
          playersPerSide: match.playersPerSide,
          scheduledAt: match.scheduledAt.toISOString(),
          venueId: match.venueId,
          stage: match.stage,
          tossWonByTeamId: match.tossWonByTeamId,
          tossDecision: match.tossDecision,
          umpire1: match.umpire1,
          umpire2: match.umpire2,
        }}
        home={home ? { id: home.id, name: home.name, shortName: home.shortName } : null}
        away={away ? { id: away.id, name: away.name, shortName: away.shortName } : null}
        homeSquad={squadOf(home?.id)}
        awaySquad={squadOf(away?.id)}
        venues={venues}
        existingXI={existingXI}
      />
    </>
  );
}
