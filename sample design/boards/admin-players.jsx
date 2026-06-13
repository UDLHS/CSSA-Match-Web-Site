// boards/admin-players.jsx — Players list + full player editor
const PLAYER_ROWS = [
  ["K. Perera", "CST", "Batter", "Right-hand", "Off-spin", 7, 7, 342, "Active", "bat"],
  ["R. Jayasuriya", "SES", "Batter", "Left-hand", "—", 26, 7, 198, "Active", "bat"],
  ["M. Fernando", "SES", "Bowler", "Right-hand", "Right-arm fast", 4, 7, 318, "Active", "ball"],
  ["D. Bandara", "AIB", "All-rounder", "Right-hand", "Leg-spin", 21, 6, 296, "Active", "bat"],
  ["T. Silva", "CST", "WK-Batter", "Right-hand", "—", 18, 7, 154, "Active", "field"],
  ["S. Rathnayake", "DSD", "Batter", "Left-hand", "—", 5, 7, 241, "Injured", "bat"],
  ["A. Wickramasinghe", "ISW", "WK-Batter", "Right-hand", "—", 1, 6, 212, "Active", "field"],
  ["P. Gunawardena", "NSC", "Bowler", "Right-hand", "Left-arm spin", 9, 6, 187, "Active", "ball"],
];

function PlayersListScreen() {
  return (
    <AdminShell active="Players" title="Players">
      <PageHead title="Players" sub="64 players · filter by team or role, then edit any field"
        actions={<><span className="btn btn-ghost btn-sm"><Icon d={IC.upload} size={14} /> Import CSV</span><span className="btn btn-primary"><Icon d={IC.plus} size={15} /> Add player</span></>} />
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <SearchBar ph="Search players…" />
        <SelectBox value="All teams" icon={IC.shield} />
        <SelectBox value="All roles" icon={IC.filter} />
        <SelectBox value="All statuses" w={150} />
      </div>
      <TableWrap>
        <thead><tr>
          <th>Player</th><th>Team</th><th>Role</th><th>Batting</th><th>Bowling</th><th className="num">No.</th><th className="num">M</th><th className="num">Votes</th><th>Status</th><th className="num">Actions</th>
        </tr></thead>
        <tbody>
          {PLAYER_ROWS.map(r => (
            <tr key={r[0]}>
              <td><span className="row" style={{ gap: 10 }}><RoleAvatar name={r[0]} size={28} color={TEAMS[r[1]].color} role={r[9]} /><span style={{ fontWeight: 600 }}>{r[0]}</span></span></td>
              <td><span className="row" style={{ gap: 6, fontSize: 12, color: "var(--text-muted)" }}><TeamLogo t={r[1]} size="sm" />{TEAMS[r[1]].name}</span></td>
              <td>{r[2]}</td><td style={{ color: "var(--text-muted)" }}>{r[3]}</td><td style={{ color: "var(--text-muted)" }}>{r[4]}</td>
              <td className="num t-num">#{r[5]}</td><td className="num">{r[6]}</td><td className="num" style={{ fontWeight: 700 }}>{r[7]}</td>
              <td><StatusPill s={r[8]} /></td><td><RowActions /></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <span className="t-small" style={{ color: "var(--text-muted)" }}>Showing 8 of 64 · pagination at the bottom of the full table</span>
    </AdminShell>
  );
}

function PlayerEditScreen() {
  return (
    <AdminShell active="Players" title="Players">
      <PageHead title="Edit player — Kasun Perera" sub="Identity, role, styles, photo and popularity votes — all editable"
        actions={<><span className="btn btn-danger btn-sm"><Icon d={IC.trash} size={14} /> Delete</span><span className="btn btn-primary"><Icon d={IC.check2} size={15} /> Save player</span></>} />
      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 16, alignItems: "start" }}>
        <Panel title="Profile photo & identity">
          <UploadField tall hint={<span>PNG/JPG, square, ≥400px. <span style={{ color: "var(--primary)", fontWeight: 600 }}>Upload</span> · falls back to initials</span>}>
            <RoleAvatar name="K. Perera" size={64} color={TEAMS.CST.color} role="bat" />
          </UploadField>
          <Field label="Full name" req><TextIn value="Kasun Perera" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
            <Field label="Team" req><SelectIn value="CS Titans" /></Field>
            <Field label="Jersey #" req><TextIn value="7" mono /></Field>
          </div>
          <Field label="Date of birth"><TextIn value="2003-04-12" mono /></Field>
          <Field label="Status"><Radio options={["Active", "Injured", "Suspended"]} active="Active" /></Field>
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Cricketing role & style">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Primary role" req><SelectIn value="Batter" /></Field>
              <Field label="Batting hand" req><SelectIn value="Right-hand" /></Field>
              <Field label="Bowling style"><SelectIn value="Right-arm off-spin" /></Field>
              <Field label="Is captain?"><div style={{ paddingTop: 6 }}><ToggleRow label="Team captain" on /></div></Field>
            </div>
            <Field label="Short bio"><TextArea value="Top-order anchor and part-time off-spinner. Tournament's leading run-scorer with three fifties in the '26 season." rows={2} /></Field>
          </Panel>
          <Panel title="Popularity votes" sub="Admin override — used for the public ranking">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, alignItems: "end" }}>
              <Field label="Current votes"><NumIn value="342" /></Field>
              <Field label="Adjustment note" hint="Logged to the audit trail"><TextIn ph="e.g. corrected double-count" /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[["Runs", "246"], ["Wickets", "4"], ["Matches", "7"], ["Rank", "#1"]].map(([l, v]) => (
                <div key={l} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
                  <span className="t-label" style={{ fontSize: 9.5 }}>{l}</span>
                  <div className="t-num" style={{ fontWeight: 700, fontSize: 17 }}>{v}</div>
                </div>
              ))}
            </div>
            <span className="t-small" style={{ color: "var(--text-muted)" }}>Stats are computed from scored matches — read-only here. Use Leaderboard → Rebuild to recompute.</span>
          </Panel>
        </div>
      </div>
      <FormActions saveLabel="Save player" />
    </AdminShell>
  );
}

Object.assign(window, { PlayersListScreen, PlayerEditScreen });
