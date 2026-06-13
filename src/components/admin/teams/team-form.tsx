"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeam, updateTeam, softDeleteTeam } from "@/server/actions/teams";
import { PageHead, Panel, Field } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";
import { passesTeamContrast, isValidHex } from "@/lib/color";

interface TeamInit {
  id?: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  coach: string;
  groupName: string;
  foundedYear: string;
  status: string;
  bio: string;
}

const STATUSES = ["ACTIVE", "PENDING", "SUSPENDED"];

export function TeamForm({
  init,
  venues,
}: {
  init?: TeamInit;
  venues: { id: string; name: string; location: string }[];
}) {
  const router = useRouter();
  const editing = !!init?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TeamInit>(
    init ?? {
      name: "",
      shortName: "",
      primaryColor: "#4338CA",
      secondaryColor: "",
      coach: "",
      groupName: "",
      foundedYear: "",
      status: "ACTIVE",
      bio: "",
    },
  );
  const set = <K extends keyof TeamInit>(k: K, v: TeamInit[K]) => setForm((f) => ({ ...f, [k]: v }));

  const primaryOk = passesTeamContrast(form.primaryColor);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryOk) {
      setError("Primary color fails the 4.5:1 contrast check against white text.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      shortName: form.shortName,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor || null,
      coach: form.coach || null,
      groupName: form.groupName || null,
      foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
      status: form.status,
      bio: form.bio || null,
    };
    const res = editing
      ? await updateTeam({ id: init!.id, ...payload })
      : await createTeam(payload);
    if (!res.ok) {
      setError(res.error.message);
      setBusy(false);
      return;
    }
    router.push("/admin/teams");
    router.refresh();
  };

  const onDelete = async () => {
    if (!editing || !confirm("Soft-delete this team? History is preserved.")) return;
    setBusy(true);
    const res = await softDeleteTeam(init!.id!);
    if (!res.ok) { setError(res.error.message); setBusy(false); return; }
    router.push("/admin/teams");
    router.refresh();
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHead
        title={editing ? `Edit team — ${form.name}` : "New team"}
        sub="Changes apply across the public site instantly"
        actions={
          <span className="row" style={{ gap: 8 }}>
            {editing && (
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}>
                <Icon d={IC.trash} size={14} /> Delete
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <Icon d={IC.check2} size={15} /> {busy ? "Saving…" : editing ? "Save changes" : "Save team"}
            </button>
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
          <Field label="Team name" req><span className="input"><input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="DS Dynamos" /></span></Field>
          <Field label="Short name" req hint="≤4 chars — shown on logos & scorecards"><span className="input"><input type="text" required maxLength={4} value={form.shortName} onChange={(e) => set("shortName", e.target.value.toUpperCase())} placeholder="DSD" /></span></Field>
        </div>
        <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Primary color" req error={!primaryOk && isValidHex(form.primaryColor) ? "Fails 4.5:1 contrast against white — pick darker" : undefined} hint={primaryOk ? "Auto-checked for 4.5:1 contrast" : undefined}>
            <span className={"input" + (!primaryOk && isValidHex(form.primaryColor) ? " is-error" : "")} style={{ gap: 10 }}>
              <input type="color" value={isValidHex(form.primaryColor) ? form.primaryColor : "#4338CA"} onChange={(e) => set("primaryColor", e.target.value.toUpperCase())} style={{ width: 28, height: 24, border: "none", background: "none", padding: 0, cursor: "pointer" }} />
              <input type="text" className="t-num" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value.toUpperCase())} style={{ flex: 1 }} />
            </span>
          </Field>
          <Field label="Secondary color" hint="Decorative — not behind text">
            <span className="input" style={{ gap: 10 }}>
              <input type="color" value={isValidHex(form.secondaryColor) ? form.secondaryColor : "#EEF0FF"} onChange={(e) => set("secondaryColor", e.target.value.toUpperCase())} style={{ width: 28, height: 24, border: "none", background: "none", padding: 0, cursor: "pointer" }} />
              <input type="text" className="t-num" value={form.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value.toUpperCase())} placeholder="optional" style={{ flex: 1 }} />
            </span>
          </Field>
        </div>
      </Panel>

      <Panel title="Details">
        <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
          <Field label="Coach / mentor"><span className="input"><input type="text" value={form.coach} onChange={(e) => set("coach", e.target.value)} /></span></Field>
          <Field label="Group"><span className="input"><input type="text" value={form.groupName} onChange={(e) => set("groupName", e.target.value)} placeholder="Group A" /></span></Field>
          <Field label="Founded"><span className="input"><input type="number" className="t-num" value={form.foundedYear} onChange={(e) => set("foundedYear", e.target.value)} placeholder="2019" /></span></Field>
          <Field label="Status"><span className="input"><select value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select></span></Field>
        </div>
        <Field label="Description / bio"><span className="input" style={{ alignItems: "flex-start" }}><textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} style={{ background: "none", border: "none", outline: "none", color: "inherit", font: "inherit", width: "100%", resize: "vertical" }} /></span></Field>
      </Panel>
      <span className="t-small" style={{ color: "var(--muted)" }}>
        {venues.length > 0 ? "Squad management lives on the team page once created." : "Add venues to assign a home ground."}
      </span>
    </form>
  );
}
