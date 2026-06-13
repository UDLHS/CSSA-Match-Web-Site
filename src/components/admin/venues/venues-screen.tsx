"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVenue, updateVenue } from "@/server/actions/venues";
import { PageHead, Panel, Field, TableWrap, EmptyState } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

interface VenueRow {
  id: string;
  name: string;
  location: string;
  capacity: number | null;
  pitchType: string | null;
  notes: string | null;
  isAvailable: boolean;
  matches: number;
}

const BLANK = { id: "", name: "", location: "", capacity: "", pitchType: "", notes: "", isAvailable: true };

export function VenuesScreen({ venues }: { venues: VenueRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!form.id;
  const set = <K extends keyof typeof BLANK>(k: K, v: (typeof BLANK)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const edit = (v: VenueRow) =>
    setForm({ id: v.id, name: v.name, location: v.location, capacity: v.capacity?.toString() ?? "", pitchType: v.pitchType ?? "", notes: v.notes ?? "", isAvailable: v.isAvailable });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      location: form.location,
      capacity: form.capacity ? Number(form.capacity) : null,
      pitchType: form.pitchType || null,
      notes: form.notes || null,
      isAvailable: form.isAvailable,
    };
    const res = editing ? await updateVenue({ id: form.id, ...payload }) : await createVenue(payload);
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setForm(BLANK);
    router.refresh();
  };

  return (
    <>
      <PageHead title="Venues & grounds" sub="Add and manage every place a match can be assigned to" />
      <div className="grid max-md:grid-cols-1 md:grid-cols-[7fr_5fr]" style={{ gap: 16, alignItems: "start" }}>
        {venues.length === 0 ? (
          <EmptyState icon={IC.pin} title="No venues yet" sub="Add your first ground on the right." />
        ) : (
          <TableWrap>
            <thead><tr><th>Venue</th><th>Location</th><th className="num">Cap.</th><th>Pitch</th><th className="num">Matches</th><th className="num">Edit</th></tr></thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}><span className="row" style={{ gap: 8 }}><span style={{ color: "var(--muted)" }}><Icon d={IC.pin} size={14} /></span>{v.name}</span></td>
                  <td style={{ color: "var(--muted)" }}>{v.location}</td>
                  <td className="num t-num">{v.capacity ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{v.pitchType ?? "—"}</td>
                  <td className="num">{v.matches}</td>
                  <td><button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", float: "right" }} onClick={() => edit(v)}><Icon d={IC.edit} size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}

        <Panel title={editing ? "Edit venue" : "Add venue"}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}><Icon d={IC.alert} size={13} /> {error}</div>}
            <Field label="Venue name" req><span className="input"><input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Main Ground" /></span></Field>
            <Field label="Location / city" req><span className="input"><input type="text" required value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Dalugama" /></span></Field>
            <div className="grid grid-cols-2" style={{ gap: 14 }}>
              <Field label="Capacity"><span className="input"><input type="number" className="t-num" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></span></Field>
              <Field label="Pitch type"><span className="input"><input type="text" value={form.pitchType} onChange={(e) => set("pitchType", e.target.value)} placeholder="Grass" /></span></Field>
            </div>
            <Field label="Notes"><span className="input" style={{ alignItems: "flex-start" }}><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ background: "none", border: "none", outline: "none", color: "inherit", font: "inherit", width: "100%", resize: "vertical" }} /></span></Field>
            <label className="row" style={{ gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Available for fixtures</span>
            </label>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              {editing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(BLANK)}>Cancel</button>}
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}><Icon d={IC.check2} size={14} /> {busy ? "Saving…" : "Save venue"}</button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
