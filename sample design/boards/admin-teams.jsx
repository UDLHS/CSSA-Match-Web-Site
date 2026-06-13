// boards/admin-teams.jsx — Teams list + full team editor
const TEAM_ROWS = [
  ["CST", 11, 7, 5, 2, "Active"],
  ["SES", 11, 7, 4, 3, "Active"],
  ["DSD", 11, 6, 4, 2, "Active"],
  ["ISW", 11, 6, 2, 4, "Active"],
  ["AIB", 11, 6, 5, 1, "Active"],
  ["NSC", 10, 5, 1, 4, "Pending"],
];

function TeamsListScreen() {
  return (
    <AdminShell active="Teams" title="Teams">
      <PageHead title="Teams" sub="6 teams · 64 players registered · click any row to edit every detail"
        actions={<><span className="btn btn-ghost btn-sm"><Icon d={IC.download} size={14} /> Export</span><span className="btn btn-primary"><Icon d={IC.plus} size={15} /> Add team</span></>} />
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <SearchBar ph="Search teams…" />
        <SelectBox value="All statuses" icon={IC.filter} />
        <SelectBox value="Sort: Points" w={150} />
      </div>
      <TableWrap>
        <thead><tr>
          <th>Team</th><th>Short</th><th>Colors</th><th className="num">Squad</th><th className="num">P</th><th className="num">W</th><th className="num">L</th><th>Status</th><th className="num">Actions</th>
        </tr></thead>
        <tbody>
          {TEAM_ROWS.map(([t, sq, p, w, l, st]) => (
            <tr key={t}>
              <td><span className="row" style={{ gap: 10 }}><TeamLogo t={t} /><span style={{ fontWeight: 600 }}>{TEAMS[t].name}</span></span></td>
              <td className="t-num">{t}</td>
              <td><span className="row" style={{ gap: 5 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: TEAMS[t].color, border: "1px solid var(--border)" }}></span><span style={{ width: 16, height: 16, borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border)" }}></span></span></td>
              <td className="num">{sq}</td><td className="num">{p}</td><td className="num" style={{ fontWeight: 700, color: "var(--success)" }}>{w}</td><td className="num">{l}</td>
              <td><StatusPill s={st} /></td>
              <td><RowActions /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </AdminShell>
  );
}

function SquadRow({ name, role, jersey, rt }) {
  return (
    <tr>
      <td><span className="row" style={{ gap: 9 }}><RoleAvatar name={name} size={28} color={TEAMS.CST.color} role={rt} /><span style={{ fontWeight: 600 }}>{name}</span></span></td>
      <td>{role}</td>
      <td className="t-num">#{jersey}</td>
      <td><RowActions /></td>
    </tr>
  );
}

function TeamEditScreen() {
  return (
    <AdminShell active="Teams" title="Teams">
      <PageHead title="Edit team — CS Titans" sub="Every field below is admin-editable; changes apply across the public site instantly"
        actions={<><span className="btn btn-ghost btn-sm">View public page</span><span className="btn btn-danger btn-sm"><Icon d={IC.trash} size={14} /> Delete</span><span className="btn btn-primary"><Icon d={IC.check2} size={15} /> Save changes</span></>} />
      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 16, alignItems: "start" }}>
        <Panel title="Identity">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Team name" req><TextIn value="CS Titans" /></Field>
            <Field label="Short name" req hint="Max 4 characters — shown on logos & scorecards"><TextIn value="CST" /></Field>
          </div>
          <Field label="Logo">
            <UploadField><TeamLogo t="CST" size="lg" /></UploadField>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Primary color" req hint="Auto-checked for 4.5:1 contrast"><ColorIn hex="#4338CA" /></Field>
            <Field label="Secondary color"><ColorIn hex="#EEF0FF" /></Field>
          </div>
          <Field label="Home venue" req hint="Pick from the Venues list — or add a new one">
            <SelectIn value="University Grounds, Kelaniya" />
          </Field>
        </Panel>
        <Panel title="Details">
          <Field label="Captain"><SelectIn value="K. Perera (#7)" /></Field>
          <Field label="Coach / mentor"><TextIn value="R. Wickramasinghe" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Group"><SelectIn value="Group A" /></Field>
            <Field label="Founded"><TextIn value="2019" mono /></Field>
          </div>
          <Field label="Status"><Radio options={["Active", "Pending", "Suspended"]} active="Active" /></Field>
          <Field label="Description / bio"><TextArea value="Reigning runners-up. Strong top order led by Kasun Perera; rebuilt bowling attack for the '26 season." rows={3} /></Field>
        </Panel>
      </div>
      <Panel title="Squad — 11 players" sub="Add, remove or edit any player on the roster"
        actions={<span className="btn btn-soft btn-sm"><Icon d={IC.plus} size={14} /> Add player</span>}>
        <table className="stat">
          <thead><tr><th>Player</th><th>Role</th><th>Jersey</th><th className="num">Manage</th></tr></thead>
          <tbody>
            <SquadRow name="K. Perera" role="Batter · Captain" jersey="7" rt="bat" />
            <SquadRow name="T. Silva" role="Wicketkeeper-batter" jersey="18" rt="field" />
            <SquadRow name="J. Herath" role="All-rounder" jersey="24" rt="bat" />
            <SquadRow name="D. Weerasinghe" role="Bowler" jersey="11" rt="ball" />
            <SquadRow name="H. Bandara" role="Bowler" jersey="9" rt="ball" />
          </tbody>
        </table>
        <span className="t-small" style={{ color: "var(--text-muted)" }}>Showing 5 of 11 · drag rows to reorder the batting lineup</span>
      </Panel>
    </AdminShell>
  );
}

Object.assign(window, { TeamsListScreen, TeamEditScreen });
