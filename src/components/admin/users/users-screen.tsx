"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminUser,
  updateAdminRole,
  setAdminStatus,
} from "@/server/actions/admin-users";
import { PageHead, Panel, Field, TableWrap, StatusPill } from "@/components/admin/kit";
import { Avatar } from "@/components/public/atoms";
import { Icon, IC } from "@/components/public/icons";

interface AdminUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActiveAt: string | null;
}

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super admin" },
  { value: "ADMIN", label: "Editor" },
  { value: "SCORE_UPDATER", label: "Scorer" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

const MATRIX: [string, boolean[]][] = [
  ["Teams & players", [true, true, false]],
  ["Create / edit matches", [true, true, false]],
  ["Live scoring", [true, false, true]],
  ["Sponsors & ads", [true, true, false]],
  ["Manage admin users", [true, false, false]],
  ["View dashboards", [true, true, true]],
];

function relTime(iso: string | null) {
  if (!iso) return "never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function UsersScreen({ users, selfId }: { users: AdminUser[]; selfId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const act = async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, ok?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.error!.message);
    else { if (ok) setNotice(ok); router.refresh(); }
  };

  return (
    <>
      <PageHead title="Admin users & roles" sub="Control who can edit what — scorers, editors and super admins" />
      {error && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}><Icon d={IC.alert} size={14} /> {error}</div>}
      {notice && <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--success)", background: "color-mix(in oklab, var(--success) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}><Icon d={IC.check2} size={14} /> {notice}</div>}

      <TableWrap>
        <thead><tr><th>User</th><th>Role</th><th>Last active</th><th>Status</th><th className="num">Actions</th></tr></thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.userId === selfId;
            return (
              <tr key={u.userId}>
                <td><span className="row" style={{ gap: 10 }}><Avatar name={u.name} size={30} color="var(--primary)" /><span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontWeight: 600 }}>{u.name}{isSelf ? " (you)" : ""}</span><span style={{ fontSize: 11.5, color: "var(--muted)" }}>{u.email}</span></span></span></td>
                <td>
                  <span className="input" style={{ padding: "4px 8px", display: "inline-flex", width: "auto" }}>
                    <select value={u.role} disabled={busy || isSelf} onChange={(e) => act(() => updateAdminRole({ userId: u.userId, role: e.target.value }), "Role updated")}>
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{relTime(u.lastActiveAt)}</td>
                <td><StatusPill status={u.status} /></td>
                <td>
                  <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    {!isSelf && (
                      u.status === "ACTIVE" ? (
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(() => setAdminStatus({ userId: u.userId, status: "SUSPENDED" }), "User suspended")}>Suspend</button>
                      ) : (
                        <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => act(() => setAdminStatus({ userId: u.userId, status: "ACTIVE" }), "User reactivated")}>Reactivate</button>
                      )
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>

      <div className="grid max-md:grid-cols-1 md:grid-cols-[5fr_7fr]" style={{ gap: 16, alignItems: "start" }}>
        <InviteForm busy={busy} onSubmit={act} />
        <Panel title="Role permissions" sub="What each role can change">
          <div style={{ overflowX: "auto" }}>
            <table className="stat">
              <thead><tr><th>Capability</th><th className="num">Super</th><th className="num">Editor</th><th className="num">Scorer</th></tr></thead>
              <tbody>
                {MATRIX.map(([cap, allowed]) => (
                  <tr key={cap}>
                    <td style={{ fontWeight: 600 }}>{cap}</td>
                    {allowed.map((on, i) => (
                      <td key={i} className="num">
                        {on ? <span style={{ color: "var(--success)" }}><Icon d={IC.check2} size={15} /></span> : <span style={{ color: "var(--border)" }}><Icon d={IC.x} size={14} /></span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

function InviteForm({ busy, onSubmit }: { busy: boolean; onSubmit: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, ok?: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "SCORE_UPDATER" });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(() => createAdminUser(form), `${form.email} added`);
    setForm({ name: "", email: "", password: "", role: "SCORE_UPDATER" });
  };
  return (
    <Panel title="Add admin user" sub="Creates a Supabase login + admin profile">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Full name" req><span className="input"><input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} /></span></Field>
        <Field label="Email" req><span className="input"><input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} /></span></Field>
        <Field label="Temporary password" req hint="≥8 chars — share securely; they can change it later"><span className="input"><input type="text" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} /></span></Field>
        <Field label="Role" req><span className="input"><select value={form.role} onChange={(e) => set("role", e.target.value)}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></span></Field>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy} style={{ alignSelf: "flex-end" }}><Icon d={IC.plus} size={14} /> Add user</button>
      </form>
    </Panel>
  );
}
