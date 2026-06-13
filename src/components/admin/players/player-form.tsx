"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayer, updatePlayer, softDeletePlayer } from "@/server/actions/players";
import { setPopularVotes } from "@/server/actions/votes";
import { PageHead, Panel, Field } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

interface PlayerInit {
  id?: string;
  fullName: string;
  teamId: string;
  jerseyNumber: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  isCaptain: boolean;
  status: string;
  bio: string;
  votes: number;
}

const ROLES = ["BATTER", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"];
const BAT_STYLES = ["RIGHT_HAND", "LEFT_HAND"];
const BOWL_STYLES = ["NONE", "RIGHT_ARM_FAST", "RIGHT_ARM_MEDIUM", "RIGHT_ARM_OFF_SPIN", "RIGHT_ARM_LEG_SPIN", "LEFT_ARM_FAST", "LEFT_ARM_MEDIUM", "LEFT_ARM_ORTHODOX", "LEFT_ARM_WRIST_SPIN"];
const STATUSES = ["ACTIVE", "INJURED", "SUSPENDED"];

const label = (s: string) => s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");

export function PlayerForm({
  init,
  teams,
}: {
  init?: PlayerInit;
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const editing = !!init?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PlayerInit>(
    init ?? {
      fullName: "", teamId: teams[0]?.id ?? "", jerseyNumber: "", role: "BATTER",
      battingStyle: "RIGHT_HAND", bowlingStyle: "NONE", isCaptain: false,
      status: "ACTIVE", bio: "", votes: 0,
    },
  );
  const [voteNote, setVoteNote] = useState("");
  const set = <K extends keyof PlayerInit>(k: K, v: PlayerInit[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      fullName: form.fullName,
      teamId: form.teamId || null,
      jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null,
      role: form.role,
      battingStyle: form.battingStyle,
      bowlingStyle: form.bowlingStyle,
      isCaptain: form.isCaptain,
      status: form.status,
      bio: form.bio || null,
    };
    const res = editing
      ? await updatePlayer({ id: init!.id, ...payload })
      : await createPlayer(payload);
    if (!res.ok) { setError(res.error.message); setBusy(false); return; }

    // Vote override (edit only) — requires a note for the audit trail.
    if (editing && init && form.votes !== init.votes) {
      if (!voteNote.trim()) {
        setError("Changing votes requires an adjustment note (audit trail).");
        setBusy(false);
        return;
      }
      const v = await setPopularVotes({ playerId: init.id!, votes: form.votes, note: voteNote.trim() });
      if (!v.ok) { setError(v.error.message); setBusy(false); return; }
    }

    router.push("/admin/players");
    router.refresh();
  };

  const onDelete = async () => {
    if (!editing || !confirm("Soft-delete this player?")) return;
    setBusy(true);
    const res = await softDeletePlayer(init!.id!);
    if (!res.ok) { setError(res.error.message); setBusy(false); return; }
    router.push("/admin/players");
    router.refresh();
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHead
        title={editing ? `Edit player — ${form.fullName}` : "New player"}
        sub="Identity, role, styles and popularity votes"
        actions={
          <span className="row" style={{ gap: 8 }}>
            {editing && <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}><Icon d={IC.trash} size={14} /> Delete</button>}
            <button type="submit" className="btn btn-primary" disabled={busy}><Icon d={IC.check2} size={15} /> {busy ? "Saving…" : "Save player"}</button>
          </span>
        }
      />
      {error && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}>
          <Icon d={IC.alert} size={14} /> {error}
        </div>
      )}

      <Panel title="Identity">
        <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Full name" req><span className="input"><input type="text" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Kasun Perera" /></span></Field>
          <Field label="Team"><span className="input"><select value={form.teamId} onChange={(e) => set("teamId", e.target.value)}><option value="">— unassigned —</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></span></Field>
          <Field label="Jersey #"><span className="input"><input type="number" className="t-num" value={form.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} /></span></Field>
          <Field label="Status"><span className="input"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></span></Field>
        </div>
      </Panel>

      <Panel title="Cricketing role & style">
        <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Primary role" req><span className="input"><select value={form.role} onChange={(e) => set("role", e.target.value)}>{ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}</select></span></Field>
          <Field label="Batting hand" req><span className="input"><select value={form.battingStyle} onChange={(e) => set("battingStyle", e.target.value)}>{BAT_STYLES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></span></Field>
          <Field label="Bowling style"><span className="input"><select value={form.bowlingStyle} onChange={(e) => set("bowlingStyle", e.target.value)}>{BOWL_STYLES.map((s) => <option key={s} value={s}>{s === "NONE" ? "—" : label(s)}</option>)}</select></span></Field>
          <Field label="Captain">
            <label className="row" style={{ gap: 8, paddingTop: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isCaptain} onChange={(e) => set("isCaptain", e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Team captain</span>
            </label>
          </Field>
        </div>
        <Field label="Short bio"><span className="input" style={{ alignItems: "flex-start" }}><textarea rows={2} value={form.bio} onChange={(e) => set("bio", e.target.value)} style={{ background: "none", border: "none", outline: "none", color: "inherit", font: "inherit", width: "100%", resize: "vertical" }} /></span></Field>
      </Panel>

      {editing && (
        <Panel title="Popularity votes" sub="Admin override — used for the public ranking; logged to the audit trail">
          <div className="grid max-md:grid-cols-1 md:grid-cols-[1fr_2fr]" style={{ gap: 14, alignItems: "end" }}>
            <Field label="Votes"><span className="input"><input type="number" className="t-num" min={0} value={form.votes} onChange={(e) => set("votes", Number(e.target.value))} /></span></Field>
            <Field label="Adjustment note" hint="Required when changing the count"><span className="input"><input type="text" value={voteNote} onChange={(e) => setVoteNote(e.target.value)} placeholder="e.g. corrected double-count" /></span></Field>
          </div>
          <span className="t-small" style={{ color: "var(--muted)" }}>Match stats are computed from scored deliveries — read-only. Use Leaderboard → Rebuild to recompute.</span>
        </Panel>
      )}
    </form>
  );
}
