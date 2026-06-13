import Link from "next/link";
import { listAdminMatches } from "@/server/queries/admin-entities";
import { PageHead, TableWrap, StatusPill, EmptyState } from "@/components/admin/kit";
import { TeamLogo } from "@/components/public/atoms";
import { Icon, IC } from "@/components/public/icons";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Matches — Fiesta Admin" };

export default async function AdminMatchesPage() {
  const matches = await listAdminMatches();

  return (
    <>
      <PageHead
        title="Matches & fixtures"
        sub="Create fixtures, set venue & format, pick the playing XI, then push live"
        actions={
          <Link href="/admin/matches/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <Icon d={IC.plus} size={15} /> Create match
          </Link>
        }
      />
      {matches.length === 0 ? (
        <EmptyState icon={IC.trophy} title="No matches yet" sub="Create your first fixture to get started." />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th className="num">#</th><th>Match</th><th>Date &amp; time</th><th>Venue</th><th>Format</th><th>Status</th><th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const home = m.matchTeams.find((mt) => mt.isHome)?.team;
              const away = m.matchTeams.find((mt) => !mt.isHome)?.team;
              const scorable = m.status === "LIVE" || m.status === "INNINGS_BREAK" || m.status === "UPCOMING";
              return (
                <tr key={m.id}>
                  <td className="t-num" style={{ fontWeight: 700 }}>{m.matchNumber}</td>
                  <td>
                    <span className="row" style={{ gap: 8 }}>
                      {home && <TeamLogo team={home} size="sm" />}
                      <span style={{ fontWeight: 600 }}>{home?.shortName}</span>
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>vs</span>
                      {away && <TeamLogo team={away} size="sm" />}
                      <span style={{ fontWeight: 600 }}>{away?.shortName}</span>
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{fmtDateTime(m.scheduledAt.toISOString())}</td>
                  <td><span className="row" style={{ gap: 6, fontSize: 12 }}><span style={{ color: "var(--muted)" }}><Icon d={IC.pin} size={13} /></span>{m.venue?.name ?? "—"}</span></td>
                  <td><span className="badge badge-upcoming">{m.format}</span></td>
                  <td><StatusPill status={m.status} /></td>
                  <td>
                    <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      {scorable && (
                        <Link href={`/admin/scoring/${m.id}`} className="btn btn-soft btn-sm" style={{ padding: "5px 9px", textDecoration: "none" }} title="Open scoring">
                          <Icon d={IC.bolt} size={14} />
                        </Link>
                      )}
                      <Link href={`/admin/matches/${m.id}`} className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", textDecoration: "none" }} title="Edit">
                        <Icon d={IC.edit} size={14} />
                      </Link>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
