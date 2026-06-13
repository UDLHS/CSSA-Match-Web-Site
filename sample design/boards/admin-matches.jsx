// boards/admin-matches.jsx — Matches list + match editor + Venues manager
const MATCH_ROWS = [
  [14, "SES", "CST", "Today · 2:00 PM", "University Grounds", "T20", "Live"],
  [15, "DSD", "ISW", "Jun 12 · 2:00 PM", "Main Ground", "T20", "Scheduled"],
  [16, "AIB", "NSC", "Jun 12 · 6:30 PM", "University Grounds", "T20", "Scheduled"],
  [17, "CST", "DSD", "Jun 13 · 2:00 PM", "Main Ground", "T20", "Draft"],
  [13, "AIB", "NSC", "Jun 9 · 2:00 PM", "Main Ground", "T20", "Completed"],
  [12, "DSD", "SES", "Jun 8 · 6:30 PM", "University Grounds", "T20", "Completed"],
];

function MatchesListScreen() {
  return (
    <AdminShell active="Matches" title="Matches">
      <PageHead title="Matches & fixtures" sub="Create fixtures, set venue & format, pick the playing XI, then push live"
        actions={<><span className="btn btn-ghost btn-sm"><Icon d={IC.calendar} size={14} /> Schedule view</span><span className="btn btn-primary"><Icon d={IC.plus} size={15} /> Create match</span></>} />
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <SearchBar ph="Search matches…" />
        <SelectBox value="All statuses" icon={IC.filter} />
        <SelectBox value="All venues" icon={IC.pin} w={180} />
        <SelectBox value="This week" w={150} />
      </div>
      <TableWrap>
        <thead><tr><th className="num">#</th><th>Match</th><th>Date & time</th><th>Venue</th><th>Format</th><th>Status</th><th className="num">Actions</th></tr></thead>
        <tbody>
          {MATCH_ROWS.map(r => (
            <tr key={r[0]}>
              <td className="t-num" style={{ fontWeight: 700 }}>{r[0]}</td>
              <td><span className="row" style={{ gap: 8 }}><TeamLogo t={r[1]} size="sm" /><span style={{ fontWeight: 600 }}>{r[1]}</span><span style={{ color: "var(--text-muted)", fontSize: 11 }}>vs</span><TeamLogo t={r[2]} size="sm" /><span style={{ fontWeight: 600 }}>{r[2]}</span></span></td>
              <td style={{ color: "var(--text-muted)" }}>{r[3]}</td>
              <td><span className="row" style={{ gap: 6, fontSize: 12 }}><span style={{ color: "var(--text-muted)" }}><Icon d={IC.pin} size={13} /></span>{r[4]}</span></td>
              <td><span className="badge badge-upcoming">{r[5]}</span></td>
              <td><StatusPill s={r[6]} /></td>
              <td><span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>{r[6] === "Live" || r[6] === "Scheduled" ? <IconBtn d={IC.bolt} primary /> : null}<RowActions /></span></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </AdminShell>
  );
}

function XIChecklist({ team, picked }) {
  const players = [
    ["K. Perera", "C · Batter", "bat"], ["T. Silva", "WK · Batter", "field"], ["J. Herath", "All-rounder", "bat"],
    ["D. Weerasinghe", "Bowler", "ball"], ["H. Bandara", "Bowler", "ball"], ["N. Costa", "Batter", "bat"], ["R. Fonseka", "12th man", "field"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 8 }}><TeamLogo t={team} size="sm" /><span style={{ fontWeight: 700, fontSize: 13 }}>{TEAMS[team].name}</span></span>
        <span className="badge badge-upcoming">{picked}/11 picked</span>
      </div>
      {players.map(([n, role, rt], i) => {
        const on = i < 6;
        return (
          <div key={n} className="row" style={{ gap: 10, padding: "7px 10px", borderRadius: 9, border: "1px solid " + (on ? "color-mix(in oklab, var(--primary) 35%, transparent)" : "var(--border)"), background: on ? "var(--primary-soft)" : "var(--surface)" }}>
            <span style={{ width: 17, height: 17, borderRadius: 5, flex: "none", border: on ? "none" : "1.5px solid var(--border)", background: on ? "var(--primary)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? <Icon d={IC.check2} size={12} /> : null}</span>
            <RoleAvatar name={n} size={26} color={TEAMS[team].color} role={rt} />
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{n}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{role}</span>
          </div>
        );
      })}
    </div>
  );
}

function MatchEditScreen() {
  return (
    <AdminShell active="Matches" title="Matches">
      <PageHead title="Create match" sub="Every fixture detail is admin-controlled — including the venue and the playing XI"
        actions={<><span className="btn btn-ghost btn-sm">Save as draft</span><span className="btn btn-primary"><Icon d={IC.check2} size={15} /> Create match</span></>} />
      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Fixture">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <Field label="Tournament stage" req><SelectIn value="Group stage" /></Field>
              <Field label="Match number" req><TextIn value="15" mono /></Field>
              <Field label="Round / group"><SelectIn value="Group A" /></Field>
              <Field label="Home team" req><SelectIn value="DS Dynamos" /></Field>
              <Field label="Away team" req><SelectIn value="IS Warriors" /></Field>
              <Field label="Match status"><SelectIn value="Scheduled" /></Field>
            </div>
          </Panel>
          <Panel title="Schedule & venue" sub="Place is selected by the admin from the Venues list">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Date" req><TextIn value="2026-06-12" mono /></Field>
              <Field label="Start time" req><TextIn value="14:00" mono /></Field>
            </div>
            <Field label="Venue / ground" req hint="Choose an existing ground — or add a new one inline">
              <div className="row" style={{ gap: 8 }}>
                <span style={{ flex: 1 }}><SelectIn value="Main Ground, Kelaniya" /></span>
                <span className="btn btn-soft btn-sm" style={{ flex: "none" }}><Icon d={IC.plus} size={13} /> Add venue</span>
              </div>
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
              <Field label="Format" req><SelectIn value="T20 (20 overs)" /></Field>
              <Field label="Overs / side" hint="Editable for custom"><NumIn value="20" /></Field>
              <Field label="Balls / over"><NumIn value="6" /></Field>
            </div>
            <Field label="Format presets"><Radio options={["T20", "T10", "ODI", "The Hundred", "Custom"]} active="T20" /></Field>
          </Panel>
          <Panel title="Toss & officials">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Toss winner"><SelectIn ph="Set after toss" /></Field>
              <Field label="Elected to"><Radio options={["Bat", "Bowl"]} active={null} /></Field>
              <Field label="Umpire 1"><TextIn value="A. Gunasekara" /></Field>
              <Field label="Umpire 2"><TextIn value="M. Rajapaksa" /></Field>
              <Field label="Third umpire"><TextIn ph="Optional" /></Field>
              <Field label="Assigned scorer" req><SelectIn value="Sahan A. (Scorer)" /></Field>
            </div>
          </Panel>
        </div>
        <Panel title="Playing XI" sub="Tick 11 per side — drives the live scoring dropdowns">
          <XIChecklist team="DSD" picked={6} />
          <div className="divider"></div>
          <XIChecklist team="ISW" picked={6} />
        </Panel>
      </div>
      <FormActions saveLabel="Create match" extra={<span className="btn btn-ghost">Save as draft</span>} />
    </AdminShell>
  );
}

const VENUE_ROWS = [
  ["University Grounds", "Kelaniya", "3,500", "Grass · batting", 9],
  ["Main Ground", "Dalugama", "5,000", "Grass · balanced", 12],
  ["Indoor Nets Arena", "Kelaniya", "400", "Synthetic", 3],
  ["Faculty Oval", "Peradeniya", "1,200", "Grass · spin-friendly", 0],
];

function VenuesScreen() {
  return (
    <AdminShell active="Venues" title="Venues">
      <PageHead title="Venues & grounds" sub="Add and manage every place a match can be assigned to"
        actions={<span className="btn btn-primary"><Icon d={IC.plus} size={15} /> Add venue</span>} />
      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 16, alignItems: "start" }}>
        <TableWrap>
          <thead><tr><th>Venue</th><th>Location</th><th className="num">Capacity</th><th>Pitch</th><th className="num">Matches</th><th className="num">Actions</th></tr></thead>
          <tbody>
            {VENUE_ROWS.map(r => (
              <tr key={r[0]}>
                <td style={{ fontWeight: 600 }}><span className="row" style={{ gap: 8 }}><span style={{ color: "var(--text-muted)" }}><Icon d={IC.pin} size={14} /></span>{r[0]}</span></td>
                <td style={{ color: "var(--text-muted)" }}>{r[1]}</td>
                <td className="num t-num">{r[2]}</td><td style={{ fontSize: 12 }}>{r[3]}</td><td className="num">{r[4]}</td>
                <td><RowActions /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Panel title="Add / edit venue">
          <Field label="Venue name" req><TextIn value="Main Ground" /></Field>
          <Field label="Location / city" req><TextIn value="Dalugama" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Capacity"><NumIn value="5000" /></Field>
            <Field label="Pitch type"><SelectIn value="Grass · balanced" /></Field>
          </div>
          <Field label="Map link / notes"><TextArea value="Floodlit. Parking near the south gate." rows={2} /></Field>
          <ToggleRow label="Available for fixtures" sub="Shows up in the match venue picker" on />
          <FormActions saveLabel="Save venue" />
        </Panel>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { MatchesListScreen, MatchEditScreen, VenuesScreen, XIChecklist });
