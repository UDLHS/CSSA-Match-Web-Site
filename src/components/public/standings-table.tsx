import type { StandingGroup, StandingRow } from "@/server/queries/standings";
import { fmtNrr } from "@/lib/format";
import { TeamLogo } from "./atoms";

/**
 * Public points table (boards/leaderboard standings). One block per group,
 * columns P / W / L / NR / Pts / NRR with a Q/E qualification tag. Points/NRR
 * are computed automatically as matches complete — rows arrive already
 * sorted (points desc, then NRR). Horizontally scrollable on narrow screens
 * so the numbers never squash.
 */
export function StandingsTable({ groups }: { groups: StandingGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
        The points table appears once teams are added.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {groups.map((g) => (
        <GroupTable key={g.groupName || "__single"} group={g} />
      ))}
    </div>
  );
}

function GroupTable({ group }: { group: StandingGroup }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="stat" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ width: 38 }}>#</th>
              <th>{group.groupName || "Standings"}</th>
              <th className="num">P</th>
              <th className="num">W</th>
              <th className="num">L</th>
              <th className="num">NR</th>
              <th className="num">Pts</th>
              <th className="num">NRR</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r, i) => (
              <StandingTr key={r.teamId} row={r} rank={i + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QeTag({ status }: { status: StandingRow["status"] }) {
  if (status === "QUALIFIED")
    return <span style={{ fontSize: 11, fontWeight: 700, color: "var(--live, #16a34a)" }}>(Q)</span>;
  if (status === "ELIMINATED")
    return <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>(E)</span>;
  return null;
}

function StandingTr({ row, rank }: { row: StandingRow; rank: number }) {
  return (
    <tr className={row.status === "QUALIFIED" ? "hl" : ""}>
      <td className="t-num" style={{ fontWeight: 800, color: "var(--muted)" }}>{rank}</td>
      <td>
        <span className="row" style={{ gap: 9 }}>
          <TeamLogo team={row.team} size="sm" />
          <span style={{ fontWeight: 700 }}>{row.team.shortName}</span>
          <QeTag status={row.status} />
        </span>
      </td>
      <td className="num">{row.played}</td>
      <td className="num">{row.won}</td>
      <td className="num">{row.lost}</td>
      <td className="num">{row.noResult}</td>
      <td className="num" style={{ fontWeight: 800 }}>{row.points}</td>
      <td className="num t-num" style={{ color: row.netRunRate != null && row.netRunRate < 0 ? "var(--muted)" : "inherit" }}>{fmtNrr(row.netRunRate)}</td>
    </tr>
  );
}
