"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTournamentSettings } from "@/server/actions/leaderboard";
import { PageHead, Panel, Field } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";
import type { PointsConfigInput } from "@/lib/validation/settings";

const FORMATS = ["T20", "T10", "ODI", "CUSTOM"];

export function SettingsForm({
  seasonId,
  tournamentName,
  init,
  pointsConfig,
}: {
  seasonId: string;
  tournamentName: string;
  init: {
    defaultFormat: string;
    defaultOvers: number;
    defaultBallsPerOver: number;
    playersPerSide: number;
    pointsWin: number;
    pointsTie: number;
    pointsLoss: number;
    bonusPointEnabled: boolean;
    nrrTiebreak: boolean;
    votingOpen: boolean;
    votesPublic: boolean;
  };
  pointsConfig: PointsConfigInput;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(init);
  const [pc, setPc] = useState(pointsConfig);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await updateTournamentSettings({ seasonId, ...form, pointsConfig: pc });
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setNotice("Settings saved.");
    router.refresh();
  };

  const num = (label: string, value: number, onChange: (v: number) => void) => (
    <Field label={label}>
      <span className="input"><input type="number" className="t-num" value={value} onChange={(e) => onChange(Number(e.target.value))} /></span>
    </Field>
  );

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHead
        title="Tournament settings"
        sub={tournamentName}
        actions={<button type="submit" className="btn btn-primary" disabled={busy}><Icon d={IC.check2} size={15} /> {busy ? "Saving…" : "Save settings"}</button>}
      />
      {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}><Icon d={IC.alert} size={14} /> {error}</div>}
      {notice && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--success)", background: "color-mix(in oklab, var(--success) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}><Icon d={IC.check2} size={14} /> {notice}</div>}

      <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 16, alignItems: "start" }}>
        <Panel title="Format defaults">
          <div className="grid grid-cols-3" style={{ gap: 14 }}>
            <Field label="Default format"><span className="input"><select value={form.defaultFormat} onChange={(e) => set("defaultFormat", e.target.value)}>{FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}</select></span></Field>
            {num("Overs / side", form.defaultOvers, (v) => set("defaultOvers", v))}
            {num("Players / side", form.playersPerSide, (v) => set("playersPerSide", v))}
          </div>
          {num("Balls / over", form.defaultBallsPerOver, (v) => set("defaultBallsPerOver", v))}
        </Panel>

        <Panel title="Standings points">
          <div className="grid grid-cols-3" style={{ gap: 14 }}>
            {num("Win", form.pointsWin, (v) => set("pointsWin", v))}
            {num("Tie / NR", form.pointsTie, (v) => set("pointsTie", v))}
            {num("Loss", form.pointsLoss, (v) => set("pointsLoss", v))}
          </div>
          <label className="row" style={{ gap: 8, cursor: "pointer" }}><input type="checkbox" checked={form.bonusPointEnabled} onChange={(e) => set("bonusPointEnabled", e.target.checked)} /><span style={{ fontSize: 13, fontWeight: 600 }}>Bonus point for big wins</span></label>
          <label className="row" style={{ gap: 8, cursor: "pointer" }}><input type="checkbox" checked={form.nrrTiebreak} onChange={(e) => set("nrrTiebreak", e.target.checked)} /><span style={{ fontSize: 13, fontWeight: 600 }}>Net run rate tiebreak</span></label>
        </Panel>
      </div>

      <Panel title="Overall points formula" sub="The single weights object behind the Overall leaderboard">
        <span className="t-label">Batting</span>
        <div className="grid max-md:grid-cols-2 md:grid-cols-5" style={{ gap: 12 }}>
          {num("Per run", pc.batting.perRun, (v) => setPc({ ...pc, batting: { ...pc.batting, perRun: v } }))}
          {num("Per four", pc.batting.perFour, (v) => setPc({ ...pc, batting: { ...pc.batting, perFour: v } }))}
          {num("Per six", pc.batting.perSix, (v) => setPc({ ...pc, batting: { ...pc.batting, perSix: v } }))}
          {num("Fifty bonus", pc.batting.perFifty, (v) => setPc({ ...pc, batting: { ...pc.batting, perFifty: v } }))}
          {num("Hundred bonus", pc.batting.perHundred, (v) => setPc({ ...pc, batting: { ...pc.batting, perHundred: v } }))}
        </div>
        <span className="t-label">Bowling</span>
        <div className="grid max-md:grid-cols-2 md:grid-cols-4" style={{ gap: 12 }}>
          {num("Per wicket", pc.bowling.perWicket, (v) => setPc({ ...pc, bowling: { ...pc.bowling, perWicket: v } }))}
          {num("Per run conceded", pc.bowling.perRunConceded, (v) => setPc({ ...pc, bowling: { ...pc.bowling, perRunConceded: v } }))}
          {num("Per maiden", pc.bowling.perMaiden, (v) => setPc({ ...pc, bowling: { ...pc.bowling, perMaiden: v } }))}
          {num("Econ bonus pts", pc.bowling.economyBonus.points, (v) => setPc({ ...pc, bowling: { ...pc.bowling, economyBonus: { ...pc.bowling.economyBonus, points: v } } }))}
        </div>
        <span className="t-label">Fielding</span>
        <div className="grid max-md:grid-cols-2 md:grid-cols-4" style={{ gap: 12 }}>
          {num("Per catch", pc.fielding.perCatch, (v) => setPc({ ...pc, fielding: { ...pc.fielding, perCatch: v } }))}
          {num("Per stumping", pc.fielding.perStumping, (v) => setPc({ ...pc, fielding: { ...pc.fielding, perStumping: v } }))}
          {num("Direct-hit run-out", pc.fielding.perDirectHitRunOut, (v) => setPc({ ...pc, fielding: { ...pc.fielding, perDirectHitRunOut: v } }))}
          {num("Assisted run-out", pc.fielding.perAssistedRunOut, (v) => setPc({ ...pc, fielding: { ...pc.fielding, perAssistedRunOut: v } }))}
        </div>
        <span className="t-small" style={{ color: "var(--muted)" }}>Changing weights takes effect on the next leaderboard rebuild.</span>
      </Panel>
    </form>
  );
}
