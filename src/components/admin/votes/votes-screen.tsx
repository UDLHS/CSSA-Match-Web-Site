"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPopularVotes } from "@/server/actions/votes";
import { PageHead, TableWrap, EmptyState } from "@/components/admin/kit";
import { RoleAvatar, TeamLogo } from "@/components/public/atoms";
import { Icon, IC, type ActivityRole } from "@/components/public/icons";

interface VoteRow {
  playerId: string;
  name: string;
  photoUrl: string | null;
  role: string;
  votes: number;
  team: { id: string; name: string; shortName: string; logoUrl: string | null; primaryColor: string } | null;
}

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

/** Admin-set popularity votes (never public). Each change needs an audit note. */
export function VotesScreen({ rows }: { rows: VoteRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r.playerId, r.votes])),
  );

  const save = async (playerId: string, votes: number, note: string) => {
    setBusyId(playerId);
    setError(null);
    const res = await setPopularVotes({ playerId, votes, note });
    setBusyId(null);
    if (!res.ok) { setError(res.error.message); return; }
    router.refresh();
  };

  const step = (playerId: string, delta: number) => {
    const next = Math.max(0, (local[playerId] ?? 0) + delta);
    setLocal((l) => ({ ...l, [playerId]: next }));
    void save(playerId, next, `Stepped ${delta > 0 ? "+" : ""}${delta} in admin`);
  };

  const ranked = [...rows].sort((a, b) => (local[b.playerId] ?? 0) - (local[a.playerId] ?? 0));

  return (
    <>
      <PageHead title="Popular vote" sub="Adjust counts — admin-set only, every change is audit-logged" />
      {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}><Icon d={IC.alert} size={13} /> {error}</div>}
      {rows.length === 0 ? (
        <EmptyState icon={IC.vote} title="No players to vote on" sub="Add players first." />
      ) : (
        <TableWrap>
          <thead><tr><th className="num">#</th><th>Player</th><th>Team</th><th className="num">Votes</th><th className="num">Adjust</th></tr></thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.playerId}>
                <td className="t-num" style={{ fontWeight: 700, color: i < 3 ? "var(--highlight)" : "var(--muted)" }}>{i + 1}</td>
                <td><span className="row" style={{ gap: 9 }}><RoleAvatar name={r.name} size={26} color={r.team?.primaryColor} role={roleGlyph(r.role)} photoUrl={r.photoUrl} /><span style={{ fontWeight: 600 }}>{r.name}</span></span></td>
                <td>{r.team ? <span className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}><TeamLogo team={r.team} size="sm" />{r.team.name}</span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                <td className="num t-num" style={{ fontWeight: 700, fontSize: 15 }}>{local[r.playerId] ?? 0}</td>
                <td>
                  <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px" }} disabled={busyId === r.playerId} onClick={() => step(r.playerId, -1)} aria-label="Decrease"><Icon d={IC.minus} size={14} /></button>
                    <button type="button" className="btn btn-soft btn-sm" style={{ padding: "5px 9px" }} disabled={busyId === r.playerId} onClick={() => step(r.playerId, +1)} aria-label="Increase"><Icon d={IC.plus} size={14} /></button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <span className="t-small" style={{ color: "var(--muted)" }}>
        Each ± writes an audit-logged adjustment. For large corrections, edit the player and use the votes field with a note.
      </span>
    </>
  );
}
