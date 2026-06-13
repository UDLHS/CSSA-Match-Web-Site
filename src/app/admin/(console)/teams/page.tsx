import Link from "next/link";
import { listAdminTeams } from "@/server/queries/admin-entities";
import { PageHead, TableWrap, StatusPill, EmptyState } from "@/components/admin/kit";
import { TeamLogo } from "@/components/public/atoms";
import { Icon, IC } from "@/components/public/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Teams — Fiesta Admin" };

export default async function AdminTeamsPage() {
  const teams = await listAdminTeams();

  return (
    <>
      <PageHead
        title="Teams"
        sub={`${teams.length} teams · click any row to edit every detail`}
        actions={
          <Link href="/admin/teams/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <Icon d={IC.plus} size={15} /> Add team
          </Link>
        }
      />
      {teams.length === 0 ? (
        <EmptyState icon={IC.shield} title="No teams yet" sub="Add your first team to begin." />
      ) : (
        <TableWrap>
          <thead>
            <tr><th>Team</th><th>Short</th><th>Colors</th><th className="num">Squad</th><th>Captain</th><th>Status</th><th className="num">Edit</th></tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td><span className="row" style={{ gap: 10 }}><TeamLogo team={t} /><span style={{ fontWeight: 600 }}>{t.name}</span></span></td>
                <td className="t-num">{t.shortName}</td>
                <td>
                  <span className="row" style={{ gap: 5 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: t.primaryColor, border: "1px solid var(--border)" }} />
                    {t.secondaryColor && <span style={{ width: 16, height: 16, borderRadius: 4, background: t.secondaryColor, border: "1px solid var(--border)" }} />}
                  </span>
                </td>
                <td className="num">{t._count.players}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{t.captain?.fullName ?? "—"}</td>
                <td><StatusPill status={t.status} /></td>
                <td>
                  <Link href={`/admin/teams/${t.id}`} className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", textDecoration: "none", float: "right" }}>
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
