"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertStanding, deleteStanding } from "@/server/actions/standings";
import { PageHead, Panel, Field, TableWrap, EmptyState } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

type Status = "NONE" | "QUALIFIED" | "ELIMINATED";

interface StandingRowView {
  id: string;
  teamId: string;
  teamName: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
  groupName: string;
  played: number;
  won: number;
  lost: number;
  noResult: number;
  points: number;
  netRunRate: number;
  status: Status;
}

const STATUS_OPTS: { value: Status; label: string }[] = [
  { value: "NONE", label: "— (in contention)" },
  { value: "QUALIFIED", label: "Qualified (Q)" },
  { value: "ELIMINATED", label: "Eliminated (E)" },
];

const BLANK = { teamId: "", groupName: "", points: "0", netRunRate: "0", status: "NONE" as Status };

function StatusTag({ status }: { status: Status }) {
  if (status === "QUALIFIED")
    return <span className="badge badge-completed">Q</span>;
  if (status === "ELIMINATED")
    return <span className="badge badge-abandoned">E</span>;
  return <span style={{ color: "var(--muted)" }}>—</span>;
}

export function StandingsScreen({
  seasonId,
  rows,
  teams,
}: {
  seasonId: string;
  rows: StandingRowView[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const edit = (r: StandingRowView) => {
    setEditingId(r.id);
    setForm({
      teamId: r.teamId,
      groupName: r.groupName,
      points: String(r.points),
      netRunRate: String(r.netRunRate),
      status: r.status,
    });
  };

  const reset = () => { setEditingId(null); setForm(BLANK); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teamId) { setError("Pick a team first."); return; }
    setBusy(true);
    setError(null);
    const res = await upsertStanding({
      seasonId,
      teamId: form.teamId,
      groupName: form.groupName.trim() || null,
      points: Number(form.points) || 0,
      netRunRate: Number(form.netRunRate) || 0,
      status: form.status,
      sortHint: 0,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    reset();
    router.refresh();
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    const res = await deleteStanding({ id });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    if (editingId === id) reset();
    router.refresh();
  };

  return (
    <>
      <PageHead
        title="Team standings"
        sub="Points table — P/W/L/NR fill in automatically from completed matches; you set points, NRR and the Q/E badge. Sorted by points, then NRR."
      />
      <div className="grid max-md:grid-cols-1 md:grid-cols-[7fr_5fr]" style={{ gap: 16, alignItems: "start" }}>
        {rows.length === 0 ? (
          <EmptyState icon={IC.trophy} title="No teams in the table yet" sub="Add a team on the right to start the points table." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>Team</th><th>Group</th>
                <th className="num">P</th><th className="num">W</th><th className="num">L</th><th className="num">NR</th>
                <th className="num">Pts</th><th className="num">NRR</th><th>Q/E</th><th className="num">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: r.primaryColor, color: "#fff", fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{r.shortName.slice(0, 3)}</span>
                      {r.teamName}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.groupName || "—"}</td>
                  <td className="num">{r.played}</td>
                  <td className="num">{r.won}</td>
                  <td className="num">{r.lost}</td>
                  <td className="num">{r.noResult}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{r.points}</td>
                  <td className="num t-num">{r.netRunRate > 0 ? "+" : ""}{r.netRunRate.toFixed(3)}</td>
                  <td><StatusTag status={r.status} /></td>
                  <td>
                    <span className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px" }} onClick={() => edit(r)}><Icon d={IC.edit} size={14} /></button>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", color: "var(--danger)" }} onClick={() => remove(r.id)} disabled={busy}><Icon d={IC.trash} size={14} /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}

        <Panel title={editingId ? "Edit team row" : "Add team to table"}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}><Icon d={IC.alert} size={13} /> {error}</div>}
            <Field label="Team" req hint="Re-picking an existing team just updates its row">
              <span className="input">
                <select value={form.teamId} onChange={(e) => set("teamId", e.target.value)} required>
                  <option value="">— choose team —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </span>
            </Field>
            <Field label="Group" hint="e.g. Super 8 Group 1 — leave blank for a single table">
              <span className="input"><input type="text" value={form.groupName} onChange={(e) => set("groupName", e.target.value)} placeholder="Group A" /></span>
            </Field>
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              <Field label="Points" req><span className="input"><input type="number" className="t-num" min={0} required value={form.points} onChange={(e) => set("points", e.target.value)} /></span></Field>
              <Field label="Net run rate" hint="e.g. 2.259 or -1.4"><span className="input"><input type="number" className="t-num" step="0.001" value={form.netRunRate} onChange={(e) => set("netRunRate", e.target.value)} /></span></Field>
            </div>
            <Field label="Qualification">
              <span className="input">
                <select value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
                  {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </span>
            </Field>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              {editingId && <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>}
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}><Icon d={IC.check2} size={14} /> {busy ? "Saving…" : "Save row"}</button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
