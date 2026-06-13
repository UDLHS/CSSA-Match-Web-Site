import { notFound } from "next/navigation";
import Link from "next/link";
import { TeamForm } from "@/components/admin/teams/team-form";
import { getTeamForEdit, venueOptions } from "@/server/queries/admin-entities";
import { Panel } from "@/components/admin/kit";
import { RoleAvatar } from "@/components/public/atoms";
import { type ActivityRole } from "@/components/public/icons";

export const dynamic = "force-dynamic";

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [team, venues] = await Promise.all([getTeamForEdit(id), venueOptions()]);
  if (!team) notFound();

  return (
    <>
      <Link href="/admin/teams" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
        ← All teams
      </Link>
      <TeamForm
        venues={venues}
        init={{
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          primaryColor: team.primaryColor,
          secondaryColor: team.secondaryColor ?? "",
          coach: team.coach ?? "",
          groupName: team.groupName ?? "",
          foundedYear: team.foundedYear?.toString() ?? "",
          status: team.status,
          bio: team.bio ?? "",
        }}
      />
      <Panel title={`Squad — ${team.players.length} players`} sub="Manage individual players from the Players screen">
        {team.players.length === 0 ? (
          <span className="t-small" style={{ color: "var(--muted)" }}>No players assigned yet.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {team.players.map((p) => (
              <Link key={p.id} href={`/admin/players/${p.id}`} className="row" style={{ gap: 10, padding: "7px 4px", borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}>
                <RoleAvatar name={p.fullName} size={28} color={team.primaryColor} role={roleGlyph(p.role)} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{p.fullName}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--muted)" }}>
                  {p.role.replace("_", " ").toLowerCase()}{p.jerseyNumber != null ? ` · #${p.jerseyNumber}` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
