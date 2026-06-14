"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMatch } from "@/server/actions/matches";
import { PageHead, Panel, Field } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

const FORMATS = [
  { value: "T20", label: "T20 (20 overs)", overs: 20 },
  { value: "T10", label: "T10 (10 overs)", overs: 10 },
  { value: "ODI", label: "ODI (50 overs)", overs: 50 },
  { value: "CUSTOM", label: "Custom", overs: 20 },
];

export function MatchCreateForm({
  seasonId,
  teams,
  venues,
  defaultMatchNumber,
}: {
  seasonId: string;
  teams: { id: string; name: string }[];
  venues: { id: string; name: string; location: string }[];
  defaultMatchNumber: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    matchNumber: String(defaultMatchNumber),
    stage: "Group stage",
    homeTeamId: teams[0]?.id ?? "",
    awayTeamId: teams[1]?.id ?? "",
    format: "T20",
    oversPerSide: 20,
    ballsPerOver: 6,
    playersPerSide: 11,
    scheduledAt: "",
    venueId: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createMatch({
      seasonId,
      matchNumber: Number(form.matchNumber),
      stage: form.stage || null,
      homeTeamId: form.homeTeamId,
      awayTeamId: form.awayTeamId,
      format: form.format,
      oversPerSide: form.oversPerSide,
      ballsPerOver: form.ballsPerOver,
      playersPerSide: form.playersPerSide,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : new Date(),
      venueId: form.venueId || null,
    });
    if (!res.ok) {
      setError(res.error.message);
      setBusy(false);
      return;
    }
    router.push(`/admin/matches/${res.data.id}`);
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHead
        title="Create match"
        sub="Set the fixture, format and schedule — then pick the XI on the next screen"
        actions={
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <Icon d={IC.check2} size={15} /> {busy ? "Creating…" : "Create match"}
          </button>
        }
      />
      {error && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}>
          <Icon d={IC.alert} size={14} /> {error}
        </div>
      )}

      <Panel title="Fixture">
        <div className="grid max-md:grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>
          <Field label="Match number" req hint="Auto-filled with the next free number — must be unique this season">
            <span className="input"><input type="number" min={1} required value={form.matchNumber} onChange={(e) => set("matchNumber", e.target.value)} placeholder="15" /></span>
          </Field>
          <Field label="Stage / round">
            <span className="input"><input type="text" value={form.stage} onChange={(e) => set("stage", e.target.value)} placeholder="Group stage" /></span>
          </Field>
          <Field label="Format" req>
            <span className="input">
              <select value={form.format} onChange={(e) => { const f = FORMATS.find((x) => x.value === e.target.value)!; set("format", f.value); set("oversPerSide", f.overs); }}>
                {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </span>
          </Field>
          <Field label="Home team" req>
            <span className="input"><select value={form.homeTeamId} onChange={(e) => set("homeTeamId", e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id} disabled={t.id === form.awayTeamId}>{t.name}</option>)}</select></span>
          </Field>
          <Field label="Away team" req>
            <span className="input"><select value={form.awayTeamId} onChange={(e) => set("awayTeamId", e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id} disabled={t.id === form.homeTeamId}>{t.name}</option>)}</select></span>
          </Field>
          <Field label="Players / side">
            <span className="input"><input type="number" min={2} max={11} value={form.playersPerSide} onChange={(e) => set("playersPerSide", Number(e.target.value))} /></span>
          </Field>
        </div>
      </Panel>

      <Panel title="Schedule & venue">
        <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Date & time" req>
            <span className="input"><input type="datetime-local" required value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} /></span>
          </Field>
          <Field label="Venue">
            <span className="input"><select value={form.venueId} onChange={(e) => set("venueId", e.target.value)}><option value="">— choose —</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}, {v.location}</option>)}</select></span>
          </Field>
          <Field label="Overs / side" hint="Editable for custom formats">
            <span className="input"><input type="number" min={1} max={50} value={form.oversPerSide} onChange={(e) => set("oversPerSide", Number(e.target.value))} /></span>
          </Field>
          <Field label="Balls / over">
            <span className="input"><input type="number" min={4} max={10} value={form.ballsPerOver} onChange={(e) => set("ballsPerOver", Number(e.target.value))} /></span>
          </Field>
        </div>
      </Panel>
    </form>
  );
}
