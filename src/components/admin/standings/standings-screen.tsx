"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertStanding } from "@/server/actions/standings";
import { PageHead, Panel, Field, TableWrap } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";
import { fmtNrr } from "@/lib/format";

type Status = "NONE" | "QUALIFIED" | "ELIMINATED";

interface StandingRowView {
  teamId: string;
  teamName: string;
  shortName: string;
  primaryColor: string;
  groupName: string;
  played: number;
  won: number;
  lost: number;
  noResult: number;
  points: number;
  netRunRate: number | null;
  pointsIsOverridden: boolean;
  nrrIsOverridden: boolean;
  autoPoints: number;
  autoNetRunRate: number | null;
  status: Status;
}

const STATUS_OPTS: { value: Status; label: string }[] = [
  { value: "NONE", label: "— (in contention)" },
  { value: "QUALIFIED", label: "Qualified (Q)" },
  { value: "ELIMINATED", label: "Eliminated (E)" },
];

function StatusTag({ status }: { status: Status }) {
  if (status === "QUALIFIED")
    return <span className="badge badge-completed">Q</span>;
  if (status === "ELIMINATED")
    return <span className="badge badge-abandoned">E</span>;
  return <span style={{ color: "var(--muted)" }}>—</span>;
}

/** Small "manual" tag next to a points/NRR value that's pinned by an admin. */
function OverrideTag() {
  return (
    <span
      title="Manually overridden — not the automatic value"
      style={{ fontSize: 9, fontWeight: 700, color: "var(--highlight)", marginLeft: 5, verticalAlign: "middle" }}
    >
      ✎
    </span>
  );
}

const blankForm = (r: StandingRowView) => ({
  teamId: r.teamId,
  groupName: r.groupName,
  pointsOverride: r.pointsIsOverridden ? String(r.points) : "",
  nrrOverride: r.nrrIsOverridden ? String(r.netRunRate) : "",
  status: r.status,
});

export function StandingsScreen({
  seasonId,
  rows,
}: {
  seasonId: string;
  rows: StandingRowView[];
}) {
  const router = useRouter();
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [form, setForm] = useState<ReturnType<typeof blankForm> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ReturnType<typeof blankForm>>(k: K, v: ReturnType<typeof blankForm>[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = (r: StandingRowView) => {
    setEditingTeamId(r.teamId);
    setForm(blankForm(r));
  };

  const cancel = () => { setEditingTeamId(null); setForm(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const res = await upsertStanding({
      seasonId,
      teamId: form.teamId,
      groupName: form.groupName.trim() || null,
      pointsOverride: form.pointsOverride.trim() === "" ? null : Number(form.pointsOverride),
      nrrOverride: form.nrrOverride.trim() === "" ? null : Number(form.nrrOverride),
      status: form.status,
      sortHint: 0,
    });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    cancel();
    router.refresh();
  };

  const editingRow = rows.find((r) => r.teamId === editingTeamId) ?? null;

  return (
    <>
      <PageHead
        title="Team standings"
        sub="Played/Won/Lost/NR, Points and NRR all fill in automatically the moment a match completes — no setup needed. Override points or NRR per team if a correction is needed (e.g. a penalty); leave blank to keep the automatic value. Sorted by points, then NRR."
      />
      <div className="grid max-md:grid-cols-1 md:grid-cols-[7fr_5fr]" style={{ gap: 16, alignItems: "start" }}>
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
              <tr key={r.teamId}>
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
                <td className="num" style={{ fontWeight: 800 }}>{r.points}{r.pointsIsOverridden && <OverrideTag />}</td>
                <td className="num t-num">{fmtNrr(r.netRunRate)}{r.nrrIsOverridden && <OverrideTag />}</td>
                <td><StatusTag status={r.status} /></td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", float: "right" }} onClick={() => edit(r)}><Icon d={IC.edit} size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>

        {editingRow && form && (
          <Panel title={`Edit ${editingRow.teamName}`}>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}><Icon d={IC.alert} size={13} /> {error}</div>}
              <Field label="Group" hint="e.g. Super 8 Group 1 — leave blank for a single table">
                <span className="input"><input type="text" value={form.groupName} onChange={(e) => set("groupName", e.target.value)} placeholder="Group A" /></span>
              </Field>
              <div className="grid grid-cols-2" style={{ gap: 14 }}>
                <Field label="Points override" hint={`Automatic: ${editingRow.autoPoints}. Leave blank to use it.`}>
                  <span className="input"><input type="number" className="t-num" min={0} value={form.pointsOverride} onChange={(e) => set("pointsOverride", e.target.value)} placeholder={String(editingRow.autoPoints)} /></span>
                </Field>
                <Field label="NRR override" hint={`Automatic: ${fmtNrr(editingRow.autoNetRunRate)}. Leave blank to use it.`}>
                  <span className="input"><input type="number" className="t-num" step="0.001" value={form.nrrOverride} onChange={(e) => set("nrrOverride", e.target.value)} placeholder={fmtNrr(editingRow.autoNetRunRate)} /></span>
                </Field>
              </div>
              <Field label="Qualification">
                <span className="input">
                  <select value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
                    {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </span>
              </Field>
              <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}><Icon d={IC.check2} size={14} /> {busy ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </Panel>
        )}
      </div>
    </>
  );
}
