// boards/foundations.jsx — palettes, typography, core components
function Swatch({ varName, label, dark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span style={{ height: 44, borderRadius: 8, background: `var(${varName})`, border: "1px solid var(--border)" }}></span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>
  );
}

function PaletteCard({ palette, title, note, recommended }) {
  const vars = [
    ["--background", "background"], ["--surface", "surface"], ["--surface-2", "surface-2"],
    ["--primary", "primary"], ["--ink", "ink / hero"], ["--accent", "accent"],
    ["--highlight", "highlight"], ["--success", "success"], ["--danger", "danger"],
    ["--border", "border"], ["--text", "text"], ["--text-muted", "text-muted"],
  ];
  const Row = ({ mode }) => (
    <div className="cf" data-palette={palette} data-mode={mode} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <span className="t-label">{mode} mode</span>
        <span className="row" style={{ gap: 6 }}>
          <Badge type="live" />
          <span className="ball ball-four ball-sm">4</span>
          <span className="ball ball-six ball-sm">6</span>
          <span className="ball ball-w ball-sm">W</span>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {vars.map(([v, l]) => <Swatch key={v} varName={v} label={l} />)}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <span className="btn btn-primary btn-sm">View scorecard</span>
        <span className="btn btn-ghost btn-sm">Secondary</span>
        <span className="t-score-md" style={{ marginLeft: "auto", color: "var(--text)" }}>162<span style={{ color: "var(--text-muted)", fontWeight: 600 }}>/8</span></span>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}>
      <div className="cf" data-palette={palette} style={{ background: "transparent" }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="t-h2">{title}</span>
          {recommended ? <span className="badge" style={{ background: "var(--highlight)", color: "#1F1500" }}>Recommended</span> : null}
        </div>
        <p className="t-small" style={{ margin: "6px 0 0", color: "var(--text-muted)", maxWidth: 520 }}>{note}</p>
      </div>
      <Row mode="light" />
      <Row mode="dark" />
    </div>
  );
}

function TypographyBoard() {
  const scale = [
    ["Score XL", "t-score-xl", "Barlow Condensed 700 · 64/64 · tabular", "162/8"],
    ["Score LG", "t-score-lg", "Barlow Condensed 700 · 40/40 · tabular", "147/4"],
    ["Display / H1", "t-display", "Barlow Condensed 700 · 36/38", "Cricket Fiesta '26"],
    ["H2", "t-h2", "Barlow Condensed 600 · 26/29", "Leaderboard — Batting"],
    ["H3", "t-h3", "Barlow Condensed 600 · 20/23", "Fall of Wickets"],
  ];
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 4 }}>
      {scale.map(([name, cls, spec, sample]) => (
        <div key={name} className="row" style={{ gap: 20, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 190, flex: "none" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{spec}</div>
          </div>
          <div className={cls}>{sample}</div>
        </div>
      ))}
      <div className="row" style={{ gap: 20, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 190, flex: "none" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Body / UI</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>IBM Plex Sans 400–600 · 14.5/22</div>
        </div>
        <div className="t-body" style={{ maxWidth: 440 }}>Kasun Perera anchors the chase with a composed half-century as CS Titans close in on the 163-run target at the university grounds.</div>
      </div>
      <div className="row" style={{ gap: 20, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 190, flex: "none" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Label</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>IBM Plex Sans 600 · 11 · +9% tracking · caps</div>
        </div>
        <div className="t-label">Required run rate</div>
      </div>
      <div className="row" style={{ gap: 20, padding: "12px 0" }}>
        <div style={{ width: 190, flex: "none" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Tabular numerals</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>font-variant-numeric: tabular-nums — digits never jitter as scores tick</div>
        </div>
        <div className="t-num" style={{ fontSize: 18, fontWeight: 700, display: "flex", flexDirection: "column" }}>
          <span>148/4 · 16.4 ov</span>
          <span>149/4 · 16.5 ov</span>
        </div>
      </div>
    </div>
  );
}

function ComponentsBoard() {
  const Sec = ({ title, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span className="t-label">{title}</span>
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 22 }}>
      <Sec title="Status badges">
        <Badge type="live" />
        <Badge type="upcoming">Upcoming</Badge>
        <Badge type="completed">Completed</Badge>
        <Badge type="break">Innings break</Badge>
        <Badge type="abandoned">Abandoned</Badge>
        <Badge type="freehit">⚡ Free hit</Badge>
      </Sec>
      <Sec title="Ball-by-ball dots — 0 / runs / 4 / 6 / W / WD / NB">
        <BallStrip balls={["0", "1", "2", "3", "4", "6", "W", "WD", "NB"]} />
      </Sec>
      <Sec title="Buttons">
        <span className="btn btn-primary">View full scorecard</span>
        <span className="btn btn-soft">Filter team</span>
        <span className="btn btn-ghost">Cancel</span>
        <span className="btn btn-danger">End innings</span>
      </Sec>
      <Sec title="Tabs — pill (cards) & underline (modals)">
        <span className="tabs">
          <span className="tab" data-active="">Live</span><span className="tab">Upcoming</span><span className="tab">Previous</span>
        </span>
        <span className="tabs tabs-underline">
          <span className="tab" data-active="">Summary</span><span className="tab">Scorecard</span><span className="tab">Ball-by-ball</span>
        </span>
      </Sec>
      <Sec title="Role indicators — follow the player by current activity">
        <span className="row" style={{ gap: 8 }}><RoleAvatar name="K. Perera" size={40} color={TEAMS.CST.color} role="bat" /> <span style={{ fontSize: 12.5, fontWeight: 600 }}>Batting</span></span>
        <span className="row" style={{ gap: 8 }}><RoleAvatar name="M. Fernando" size={40} color={TEAMS.SES.color} role="ball" /> <span style={{ fontSize: 12.5, fontWeight: 600 }}>Bowling</span></span>
        <span className="row" style={{ gap: 8 }}><RoleAvatar name="T. Silva" size={40} color={TEAMS.DSD.color} role="field" /> <span style={{ fontSize: 12.5, fontWeight: 600 }}>Fielding — name only</span></span>
        <span className="row" style={{ gap: 8, marginLeft: 8 }}><RoleIconDisc role="bat" size={26} /><RoleIconDisc role="ball" size={26} /><RoleIconDisc role="field" size={26} /> <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>standalone discs (dark UI)</span></span>
      </Sec>
      <Sec title="Sponsor slot — placeholder until the ad/partner table fills it">
        <div style={{ width: 360 }}><SponsorSlot variant="leaderboard" /></div>
      </Sec>
      <Sec title="Team identity — monogram fallback when no logo uploaded">
        {Object.keys(TEAMS).map(t => (
          <span key={t} className="row" style={{ gap: 8, border: "1px solid var(--border)", borderRadius: 999, padding: "5px 14px 5px 6px", background: "var(--surface)" }}>
            <TeamLogo t={t} /> <span style={{ fontSize: 13, fontWeight: 600 }}>{TEAMS[t].name}</span>
          </span>
        ))}
      </Sec>
      <Sec title="Inputs & validation">
        <div style={{ width: 230 }}>
          <span className="field-label">Team name</span>
          <span className="input"><span>CS Titans</span></span>
        </div>
        <div style={{ width: 230 }}>
          <span className="field-label">Short name</span>
          <span className="input is-error"><span>CSTITANS</span></span>
          <span className="field-error">Max 4 characters — shown on logos.</span>
        </div>
      </Sec>
      <Sec title="Loading — skeletons, never spinners, for scores & tables">
        <div className="card" style={{ width: 280, padding: 14, display: "flex", flexDirection: "column", gap: 10, boxShadow: "none" }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="skl" style={{ width: 34, height: 34, borderRadius: "50%" }}></span>
            <span className="skl" style={{ width: 110, height: 13 }}></span>
            <span className="skl" style={{ width: 56, height: 26, marginLeft: "auto" }}></span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <span className="skl" style={{ width: 34, height: 34, borderRadius: "50%" }}></span>
            <span className="skl" style={{ width: 90, height: 13 }}></span>
            <span className="skl" style={{ width: 56, height: 26, marginLeft: "auto" }}></span>
          </div>
        </div>
      </Sec>
    </div>
  );
}

Object.assign(window, { PaletteCard, TypographyBoard, ComponentsBoard });
