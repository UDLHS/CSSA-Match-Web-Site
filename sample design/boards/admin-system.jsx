// boards/admin-system.jsx — Admin Users, Audit Logs, Tournament Settings
const ADMIN_USERS = [
  ["Sahan Abeysekara", "sahan@cssa.lk", "Super admin", "All access", "Online now", "Active"],
  ["Ruwan Dias", "ruwan@cssa.lk", "Scorer", "Live scoring", "8 min ago", "Active"],
  ["Nadeesha Silva", "nadeesha@cssa.lk", "Editor", "Teams · Players", "2 h ago", "Active"],
  ["Imal Perera", "imal@cssa.lk", "Scorer", "Live scoring", "Yesterday", "Active"],
  ["Tharindu K.", "tharindu@cssa.lk", "Viewer", "Read-only", "3 days ago", "Suspended"],
];

function AdminUsersScreen() {
  return (
    <AdminShell active="Admin Users" title="Admin Users">
      <PageHead title="Admin users & roles" sub="Control who can edit what — scorers, editors and super admins"
        actions={<span className="btn btn-primary"><Icon d={IC.plus} size={15} /> Invite user</span>} />
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <SearchBar ph="Search users…" />
        <SelectBox value="All roles" icon={IC.filter} />
        <SelectBox value="All statuses" w={150} />
      </div>
      <TableWrap>
        <thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Last active</th><th>Status</th><th className="num">Actions</th></tr></thead>
        <tbody>
          {ADMIN_USERS.map(([n, e, role, scope, last, st]) => (
            <tr key={e}>
              <td><span className="row" style={{ gap: 10 }}><Avatar name={n} size={30} color="var(--primary)" /><span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontWeight: 600 }}>{n}</span><span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{e}</span></span></span></td>
              <td><span className="badge" style={{ background: role === "Super admin" ? "var(--primary-soft)" : "var(--surface-2)", color: role === "Super admin" ? "var(--primary)" : "var(--text-muted)" }}>{role}</span></td>
              <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{scope}</td>
              <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{last}</td>
              <td><StatusPill s={st} /></td>
              <td><RowActions /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Panel title="Role permissions" sub="What each role can change — fully configurable">
        <table className="stat">
          <thead><tr><th>Capability</th><th className="num">Super admin</th><th className="num">Editor</th><th className="num">Scorer</th><th className="num">Viewer</th></tr></thead>
          <tbody>
            {[["Teams & players", 1, 1, 0, 0], ["Create / edit matches", 1, 1, 0, 0], ["Live scoring", 1, 0, 1, 0], ["Sponsors & ads", 1, 1, 0, 0], ["Manage admin users", 1, 0, 0, 0], ["View dashboards", 1, 1, 1, 1]].map(row => (
              <tr key={row[0]}>
                <td style={{ fontWeight: 600 }}>{row[0]}</td>
                {row.slice(1).map((v, i) => <td key={i} className="num">{v ? <span style={{ color: "var(--success)" }}><Icon d={IC.check2} size={15} /></span> : <span style={{ color: "var(--border)" }}><Icon d={IC.x} size={14} /></span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AdminShell>
  );
}

const LOG_ROWS = [
  ["16:42:08", "Sahan A.", "Logged ball", "Match 14 · 16.3", "1 run — Perera to long-on"],
  ["16:41:55", "Sahan A.", "Edited ball", "Match 14 · 16.2", "4 → 6 (recompute)"],
  ["16:30:12", "Ruwan D.", "Started innings", "Match 14", "2nd innings · target 163"],
  ["15:58:40", "Nadeesha S.", "Updated player", "K. Perera", "Votes 338 → 342"],
  ["15:40:02", "Sahan A.", "Loaded ad", "Home · Skyscraper", "BrightPay · Jun 5–20"],
  ["14:12:33", "Nadeesha S.", "Created match", "Match 17", "CST vs DSD · Jun 13"],
  ["13:05:19", "Sahan A.", "Added venue", "Faculty Oval", "Peradeniya · cap 1,200"],
  ["11:47:50", "Ruwan D.", "Updated team", "CS Titans", "Captain set to K. Perera"],
];

function AuditLogsScreen() {
  return (
    <AdminShell active="Audit Logs" title="Audit Logs">
      <PageHead title="Audit logs" sub="Every change is recorded — who, what, when"
        actions={<span className="btn btn-ghost btn-sm"><Icon d={IC.download} size={14} /> Export CSV</span>} />
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <SearchBar ph="Search logs…" />
        <SelectBox value="All users" icon={IC.user} />
        <SelectBox value="All actions" icon={IC.filter} />
        <SelectBox value="Today" w={140} />
      </div>
      <TableWrap>
        <thead><tr><th style={{ width: 90 }}>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
        <tbody>
          {LOG_ROWS.map((r, i) => (
            <tr key={i}>
              <td className="t-num" style={{ color: "var(--text-muted)" }}>{r[0]}</td>
              <td><span className="row" style={{ gap: 8 }}><Avatar name={r[1]} size={24} color="var(--primary)" /><span style={{ fontWeight: 600, fontSize: 12.5 }}>{r[1]}</span></span></td>
              <td><span className="badge badge-upcoming">{r[2]}</span></td>
              <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r[3]}</td>
              <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <span className="t-small" style={{ color: "var(--text-muted)" }}>Showing 8 of 1,204 entries · retained for the full season</span>
    </AdminShell>
  );
}

function SettingsScreen() {
  return (
    <AdminShell active="Settings" title="Settings">
      <PageHead title="Tournament settings" sub="Global configuration — branding, formats, points and voting"
        actions={<span className="btn btn-primary"><Icon d={IC.check2} size={15} /> Save settings</span>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <Panel title="General & branding">
          <Field label="Tournament name" req><TextIn value="CSSA Cricket Fiesta '26" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
            <Field label="Organising body"><TextIn value="CSSA · University of Kelaniya" /></Field>
            <Field label="Season"><TextIn value="2026" mono /></Field>
          </div>
          <Field label="Tournament logo">
            <UploadField><img src="assets/logo.png" alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} /></UploadField>
          </Field>
          <Field label="Default theme palette" hint="Site-wide accent direction">
            <Radio options={["Indigo · Gold", "Navy · Emerald", "Fiesta · Sunset"]} active="Fiesta · Sunset" />
          </Field>
          <Field label="Default mode"><Radio options={["Light", "Dark", "System"]} active="Light" /></Field>
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Format defaults">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <Field label="Default format"><SelectIn value="T20" /></Field>
              <Field label="Overs / side"><NumIn value="20" /></Field>
              <Field label="Players / side"><NumIn value="11" /></Field>
            </div>
            <ToggleRow label="Super over on tie" sub="Auto-trigger a one-over eliminator" on />
            <ToggleRow label="Allow custom formats" sub="The Hundred, T10 and bespoke overs" on />
          </Panel>
          <Panel title="Points system">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <Field label="Win"><NumIn value="2" /></Field>
              <Field label="Tie / NR"><NumIn value="1" /></Field>
              <Field label="Loss"><NumIn value="0" /></Field>
            </div>
            <ToggleRow label="Bonus point for big wins" sub="≥1.25× run-rate margin" />
            <ToggleRow label="Net run rate tiebreak" on />
          </Panel>
          <Panel title="Danger zone" pad={16}>
            <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>Reset all tournament data</span>
                <span className="t-small" style={{ color: "var(--text-muted)" }}>Wipes matches, scores & votes. Teams kept. Cannot be undone.</span>
              </span>
              <span className="btn btn-danger btn-sm" style={{ flex: "none" }}><Icon d={IC.trash} size={14} /> Reset…</span>
            </div>
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminUsersScreen, AuditLogsScreen, SettingsScreen });
