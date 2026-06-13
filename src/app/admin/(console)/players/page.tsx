import Link from "next/link";
import { listAdminPlayers } from "@/server/queries/admin-entities";
import { PageHead, TableWrap, StatusPill, EmptyState } from "@/components/admin/kit";
import { RoleAvatar, TeamLogo } from "@/components/public/atoms";
import { Icon, IC, type ActivityRole } from "@/components/public/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Players — Fiesta Admin" };

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

const ROLE_LABEL: Record<string, string> = {
  BATTER: "Batter",
  BOWLER: "Bowler",
  ALL_ROUNDER: "All-rounder",
  WICKET_KEEPER: "WK-Batter",
};

export default async function AdminPlayersPage() {
  const players = await listAdminPlayers();

  return (
    <>
      <PageHead
        title="Players"
        sub={`${players.length} players · edit any field`}
        actions={
          <Link href="/admin/players/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <Icon d={IC.plus} size={15} /> Add player
          </Link>
        }
      />
      {players.length === 0 ? (
        <EmptyState icon={IC.users} title="No players yet" sub="Add your first player to begin." />
      ) : (
        <TableWrap>
          <thead>
            <tr><th>Player</th><th>Team</th><th>Role</th><th className="num">No.</th><th className="num">Votes</th><th>Status</th><th className="num">Edit</th></tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td><span className="row" style={{ gap: 10 }}><RoleAvatar name={p.fullName} size={28} color={p.team?.primaryColor} role={roleGlyph(p.role)} photoUrl={p.photoUrl} /><span style={{ fontWeight: 600 }}>{p.fullName}</span></span></td>
                <td>{p.team ? <span className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}><TeamLogo team={p.team} size="sm" />{p.team.name}</span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                <td>{ROLE_LABEL[p.role] ?? p.role}</td>
                <td className="num t-num">{p.jerseyNumber != null ? `#${p.jerseyNumber}` : "—"}</td>
                <td className="num" style={{ fontWeight: 700 }}>{p.popularVote?.votes ?? 0}</td>
                <td><StatusPill status={p.status} /></td>
                <td>
                  <Link href={`/admin/players/${p.id}`} className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", textDecoration: "none", float: "right" }}>
                    <Icon d={IC.edit} size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
