"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  createAd,
  toggleAd,
  deleteAd,
} from "@/server/actions/sponsors";
import { PageHead, Panel, Field, TableWrap, StatusPill, EmptyState } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";
import { fmtDateShort } from "@/lib/format";

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  status: string;
}
interface Ad {
  id: string;
  placement: string;
  imageUrl: string;
  clickUrl: string;
  startDate: string;
  endDate: string;
  rotationWeight: number;
  isActive: boolean;
  impressions: number;
  sponsorName: string;
}

const TIERS = ["TITLE", "CO_SPONSOR", "MEDIA_PARTNER", "BEVERAGE_PARTNER", "PARTNER"];
const SPONSOR_STATUSES = ["ACTIVE", "PENDING", "ARCHIVED"];
const PLACEMENTS: { value: string; label: string; dims: string }[] = [
  { value: "HOME_LEADERBOARD_BANNER", label: "Home · Leaderboard banner", dims: "728×90" },
  { value: "HOME_SKYSCRAPER", label: "Home · Skyscraper", dims: "160×600" },
  { value: "MATCH_INFEED_BANNER", label: "Match page · In-feed banner", dims: "320×100" },
  { value: "LEADERBOARD_BANNER", label: "Leaderboard · Banner", dims: "728×90" },
  { value: "FOOTER_PARTNERS", label: "Footer · Partners strip", dims: "Logos" },
];
const tierLabel = (t: string) => t.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
const placementLabel = (p: string) => PLACEMENTS.find((x) => x.value === p)?.label ?? p;

export function SponsorsScreen({ sponsors, ads }: { sponsors: Sponsor[]; ads: Ad[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.error!.message);
    else router.refresh();
  };

  return (
    <>
      <PageHead title="Sponsors & ads" sub="Manage sponsors and load creatives into any ad slot" />
      {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}><Icon d={IC.alert} size={14} /> {error}</div>}

      <div className="grid max-md:grid-cols-1 md:grid-cols-[7fr_5fr]" style={{ gap: 16, alignItems: "start" }}>
        <Panel title="Ad placements" sub="Each creative, its sponsor and live status">
          {ads.length === 0 ? (
            <span className="t-small" style={{ color: "var(--muted)" }}>No ads loaded yet — use the form to add one.</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ads.map((ad) => (
                <div key={ad.id} className="row" style={{ gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12, background: ad.isActive ? "var(--surface)" : "var(--surface-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ad.imageUrl} alt="" style={{ width: 52, height: 38, borderRadius: 7, objectFit: "cover", flex: "none", background: "var(--surface-2)" }} />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{placementLabel(ad.placement)}</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{ad.sponsorName} · {fmtDateShort(ad.startDate)}–{fmtDateShort(ad.endDate)}</span>
                  </span>
                  <span className="t-num" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>{ad.impressions} views</span>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px 9px" }} disabled={busy} onClick={() => act(() => toggleAd(ad.id))}>
                    {ad.isActive ? "On" : "Off"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px 9px", color: "var(--danger)" }} disabled={busy} onClick={() => { if (confirm("Delete this ad?")) act(() => deleteAd(ad.id)); }}>
                    <Icon d={IC.trash} size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <LoadAdForm sponsors={sponsors} busy={busy} onSubmit={act} />
      </div>

      <SponsorsTable sponsors={sponsors} busy={busy} onAct={act} />
    </>
  );
}

function LoadAdForm({ sponsors, busy, onSubmit }: { sponsors: Sponsor[]; busy: boolean; onSubmit: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) => void }) {
  const [form, setForm] = useState({ placement: PLACEMENTS[0].value, sponsorId: sponsors[0]?.id ?? "", imageUrl: "", clickUrl: "", startDate: "", endDate: "", rotationWeight: 1, isActive: true });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dims = PLACEMENTS.find((p) => p.value === form.placement)?.dims;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(() => createAd({ ...form, startDate: new Date(form.startDate), endDate: new Date(form.endDate) }));
  };

  return (
    <Panel title="Load new ad" sub="Paste a hosted image URL (Supabase Storage or any CDN)">
      {sponsors.length === 0 ? (
        <span className="t-small" style={{ color: "var(--muted)" }}>Add a sponsor below first.</span>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Placement" req hint={dims ? `Required size: ${dims}` : undefined}>
            <span className="input"><select value={form.placement} onChange={(e) => set("placement", e.target.value)}>{PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.dims})</option>)}</select></span>
          </Field>
          <Field label="Sponsor" req><span className="input"><select value={form.sponsorId} onChange={(e) => set("sponsorId", e.target.value)}>{sponsors.map((s) => <option key={s.id} value={s.id}>{s.name} — {tierLabel(s.tier)}</option>)}</select></span></Field>
          <Field label="Creative image URL" req><span className="input"><input type="url" required value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…/banner.png" /></span></Field>
          <Field label="Click-through URL" req><span className="input"><input type="url" required value={form.clickUrl} onChange={(e) => set("clickUrl", e.target.value)} placeholder="https://sponsor.lk/fiesta" /></span></Field>
          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            <Field label="Start date" req><span className="input"><input type="date" required value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></span></Field>
            <Field label="End date" req><span className="input"><input type="date" required value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></span></Field>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 12, alignItems: "end" }}>
            <Field label="Rotation weight" hint="Higher = shown more"><span className="input"><input type="number" min={1} max={100} value={form.rotationWeight} onChange={(e) => set("rotationWeight", Number(e.target.value))} /></span></Field>
            <label className="row" style={{ gap: 8, paddingBottom: 8, cursor: "pointer" }}><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /><span style={{ fontSize: 13, fontWeight: 600 }}>Activate now</span></label>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy} style={{ alignSelf: "flex-end" }}><Icon d={IC.upload} size={14} /> Load ad</button>
        </form>
      )}
    </Panel>
  );
}

function SponsorsTable({ sponsors, busy, onAct }: { sponsors: Sponsor[]; busy: boolean; onAct: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) => void }) {
  const [form, setForm] = useState({ id: "", name: "", tier: "PARTNER", websiteUrl: "", logoUrl: "", status: "PENDING" });
  const editing = !!form.id;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => setForm({ id: "", name: "", tier: "PARTNER", websiteUrl: "", logoUrl: "", status: "PENDING" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, tier: form.tier, websiteUrl: form.websiteUrl || null, logoUrl: form.logoUrl || null, status: form.status };
    onAct(() => editing ? updateSponsor({ id: form.id, ...payload }) : createSponsor(payload));
    reset();
  };

  return (
    <Panel title="Sponsors" sub="Tier drives where logos appear (footer, presented-by tags)">
      <div className="grid max-md:grid-cols-1 md:grid-cols-[7fr_5fr]" style={{ gap: 14, alignItems: "start" }}>
        {sponsors.length === 0 ? (
          <EmptyState icon={IC.image} title="No sponsors yet" sub="Add your first on the right." />
        ) : (
          <TableWrap>
            <thead><tr><th>Sponsor</th><th>Tier</th><th>Status</th><th className="num">Manage</th></tr></thead>
            <tbody>
              {sponsors.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td><span className="badge badge-upcoming">{tierLabel(s.tier)}</span></td>
                  <td><StatusPill status={s.status} /></td>
                  <td>
                    <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px" }} onClick={() => setForm({ id: s.id, name: s.name, tier: s.tier, websiteUrl: s.websiteUrl ?? "", logoUrl: s.logoUrl ?? "", status: s.status })}><Icon d={IC.edit} size={14} /></button>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "5px 9px", color: "var(--danger)" }} disabled={busy} onClick={() => { if (confirm("Delete sponsor and its ads?")) onAct(() => deleteSponsor(s.id)); }}><Icon d={IC.trash} size={14} /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <div className="card" style={{ padding: 16 }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="t-h3">{editing ? "Edit sponsor" : "Add sponsor"}</span>
            <Field label="Name" req><span className="input"><input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} /></span></Field>
            <Field label="Tier"><span className="input"><select value={form.tier} onChange={(e) => set("tier", e.target.value)}>{TIERS.map((t) => <option key={t} value={t}>{tierLabel(t)}</option>)}</select></span></Field>
            <Field label="Website"><span className="input"><input type="url" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://…" /></span></Field>
            <Field label="Logo URL"><span className="input"><input type="url" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" /></span></Field>
            <Field label="Status"><span className="input"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{SPONSOR_STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select></span></Field>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              {editing && <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>}
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}><Icon d={IC.check2} size={14} /> Save</button>
            </div>
          </form>
        </div>
      </div>
    </Panel>
  );
}
