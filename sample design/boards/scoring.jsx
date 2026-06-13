// boards/scoring.jsx — Admin Live Scoring (desktop + mobile) + Wicket dialog
function ScoreSummary({ mobile }) {
  return (
    <div style={{ background: "var(--hero-grad)", color: "var(--on-ink)", borderRadius: 14, padding: mobile ? 14 : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 8 }}>
          <Badge type="live" />
          <span style={{ fontSize: 11.5, color: "var(--on-ink-muted)", fontWeight: 600 }}>Match 14 · 2nd innings</span>
        </span>
        <Badge type="freehit">⚡ Free hit</Badge>
      </div>
      <div className="row" style={{ gap: mobile ? 14 : 22, flexWrap: "wrap" }}>
        <span className="row" style={{ gap: 8 }}>
          <TeamLogo t="CST" size="sm" />
          <span className={mobile ? "t-score-lg" : "t-score-lg"}>147/4 <span style={{ fontSize: 15, fontWeight: 600, color: "var(--on-ink-muted)" }}>(16.3)</span></span>
        </span>
        <span style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: mobile ? 12 : 20, marginLeft: "auto" }}>
          {[["Target", "163"], ["Need", "16 (21)"], ["CRR", "8.91"], ["RRR", "4.57"]].map(([l, v]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span className="t-label" style={{ color: "var(--on-ink-muted)", fontSize: 9.5 }}>{l}</span>
              <span className="t-num" style={{ fontSize: mobile ? 13 : 15, fontWeight: 700 }}>{v}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function PlayerRow({ role, name, fig, striker, team, rt }) {
  return (
    <div className="row" style={{ gap: 10, padding: "9px 12px", borderRadius: 10, background: striker ? "var(--primary-soft)" : "transparent", border: striker ? "1px solid color-mix(in oklab, var(--primary) 35%, transparent)" : "1px solid transparent" }}>
      <RoleAvatar name={name} size={30} color={TEAMS[team].color} role={rt} />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{name} {striker && <span style={{ color: "var(--primary)" }}>•</span>}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{role} · {fig}</span>
      </span>
      <span className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11.5 }}>Change</span>
    </div>
  );
}

function CurrentPlayers({ mobile }) {
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4, boxShadow: "none" }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "2px 4px 6px" }}>
        <span className="t-label">At the crease — CS Titans batting</span>
        <span className="btn btn-ghost btn-sm" style={{ padding: "3px 9px", fontSize: 11 }}>⇄ Swap ends</span>
      </div>
      <PlayerRow role="Striker" name="K. Perera" fig="52* (31)" striker team="CST" rt="bat" />
      <PlayerRow role="Non-striker" name="T. Silva" fig="28* (19)" team="CST" rt="bat" />
      <div className="divider" style={{ margin: "4px 0" }}></div>
      <PlayerRow role="Bowler — SE Strikers" name="M. Fernando" fig="2/24 · 3.3 ov" team="SES" rt="ball" />
    </div>
  );
}

function ScorePad({ mobile }) {
  const runs = ["0", "1", "2", "3", "4", "6"];
  const btn = (label, kind) => {
    const base = {
      height: mobile ? 58 : 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: mobile ? 22 : 24, cursor: "pointer",
      border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
      boxShadow: "0 1px 2px rgba(16,26,58,.08)", userSelect: "none",
    };
    if (kind === "four") Object.assign(base, { background: "#2563EB", color: "#fff", borderColor: "transparent" });
    if (kind === "six") Object.assign(base, { background: "#7C3AED", color: "#fff", borderColor: "transparent" });
    if (kind === "extra") Object.assign(base, { fontSize: mobile ? 13.5 : 14.5, fontFamily: "var(--font-body)", fontWeight: 700, background: "color-mix(in oklab, var(--warn) 12%, var(--surface))", color: "var(--warn)", borderColor: "color-mix(in oklab, var(--warn) 35%, transparent)" });
    if (kind === "wicket") Object.assign(base, { background: "var(--danger)", color: "#fff", borderColor: "transparent", fontFamily: "var(--font-body)", fontSize: mobile ? 15 : 16, fontWeight: 800, letterSpacing: ".04em", opacity: .45 });
    return <span key={label} style={base}>{label}</span>;
  };
  return (
    <div className="card" style={{ padding: mobile ? 12 : 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="t-label">Score this ball — one tap</span>
        <span className="row" style={{ gap: 6, fontSize: 11.5, color: "var(--warn)", fontWeight: 700 }}>⚡ FREE HIT — dismissals limited to run-out</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {runs.map(r => btn(r, r === "4" ? "four" : r === "6" ? "six" : "run"))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {["Wide", "No ball", "Bye", "Leg bye"].map(e => btn(e, "extra"))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        {btn("WICKET", "wicket")}
        <span style={{ height: mobile ? 58 : 64, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1.5px solid var(--border)", fontWeight: 700, fontSize: 14, color: "var(--text)", background: "var(--surface-2)" }}>
          <Icon d={IC.undo} size={16} /> Undo
        </span>
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Wicket is dimmed during a free hit — only run-out is allowed; the dialog pre-filters dismissal types.</span>
    </div>
  );
}

function LastBalls({ mobile }) {
  const balls = [["16.3", "1"], ["16.2", "6"], ["16.1", "W"], ["15.6", "0"], ["15.5", "4"], ["15.4", "1"]];
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, boxShadow: "none" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="t-label">Last 6 balls</span>
        <span style={{ fontSize: 11.5, color: "var(--primary)", fontWeight: 600 }}>View audit history</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {balls.slice(0, mobile ? 3 : 6).map(([ov, v], i) => (
          <div key={ov} className="row" style={{ gap: 10, padding: "6px 4px", borderBottom: "1px solid var(--border)" }}>
            <span className="t-num" style={{ fontSize: 11.5, color: "var(--text-muted)", width: 30, flex: "none" }}>{ov}</span>
            <Ball v={v} sm />
            <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v === "W" ? "Bandara c point b Fernando" : v === "6" ? "Perera — over deep midwicket" : "Perera — single to long-on"}</span>
            <span className="row" style={{ gap: 6, marginLeft: "auto" }}>
              {i === 0 && <span className="btn btn-ghost btn-sm" style={{ padding: "3px 9px", fontSize: 11 }}><Icon d={IC.undo} size={12} /> Undo</span>}
              <span className="btn btn-sm" style={{ padding: "3px 9px", fontSize: 11, background: "var(--primary-soft)", color: "var(--primary)", border: "1px dashed color-mix(in oklab, var(--primary) 45%, transparent)" }}><Icon d={IC.edit} size={11} /> Edit</span>
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Edit (dashed) recomputes everything after that ball — it always asks to confirm. Undo only removes the latest.</span>
    </div>
  );
}

function InningsControls({ mobile }) {
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, boxShadow: "none" }}>
      <span className="t-label">Match controls</span>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(2, 1fr)", gap: 8 }}>
        <span className="btn btn-ghost btn-sm">End innings…</span>
        <span className="btn btn-ghost btn-sm">Retire batter…</span>
        <span className="btn btn-danger btn-sm">Complete match…</span>
        <span className="btn btn-soft btn-sm"><Icon d={IC.trophy} size={13} /> Player of match…</span>
      </div>
      <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Buttons ending in “…” open a confirmation dialog — destructive actions are never one tap.</span>
    </div>
  );
}

function ScoringDesktop() {
  return (
    <div style={{ display: "flex", background: "var(--background)", minHeight: "100%" }}>
      <AdminSidebar active="Live Scoring" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <AdminTopbar title="Live Scoring — Match 14" />
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <ScoreSummary />
          <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 14, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <CurrentPlayers />
              <LastBalls />
              <InningsControls />
            </div>
            <ScorePad />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoringMobile() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <AdminTopbar title="Live Scoring" mobile />
      <div style={{ padding: "12px 12px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <ScoreSummary mobile />
        <CurrentPlayers mobile />
        <LastBalls mobile />
        <ScorePad mobile />
        <InningsControls mobile />
      </div>
    </div>
  );
}

function WicketDialogMobile() {
  const Field = ({ label, value, hint }) => (
    <div>
      <span className="field-label">{label}</span>
      <span className="input" style={{ justifyContent: "space-between" }}><span>{value}</span><ChevR /></span>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
  const Toggle = ({ label, on }) => (
    <div className="row" style={{ justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span style={{ width: 38, height: 22, borderRadius: 999, background: on ? "var(--primary)" : "var(--surface-2)", border: "1px solid var(--border)", position: "relative", flex: "none" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}></span>
      </span>
    </div>
  );
  return (
    <div style={{ background: "var(--surface)", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--border)", margin: "10px auto 0" }}></div>
      <div className="row" style={{ justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <span className="t-h3" style={{ color: "var(--danger)" }}>Wicket — 16.4</span>
        <Icon d={IC.x} size={16} />
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <span className="field-label">Dismissal type *</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
            {["Bowled", "Caught", "LBW", "Run out", "Stumped", "Hit wicket"].map((t, i) => (
              <span key={t} style={{ padding: "9px 4px", textAlign: "center", borderRadius: 9, fontSize: 12, fontWeight: 700, border: i === 1 ? "1.5px solid var(--danger)" : "1px solid var(--border)", background: i === 1 ? "color-mix(in oklab, var(--danger) 9%, transparent)" : "var(--surface)", color: i === 1 ? "var(--danger)" : "var(--text)" }}>{t}</span>
            ))}
          </div>
        </div>
        <Field label="Player out *" value="K. Perera (striker)" />
        <Toggle label="Bowler credited with wicket" on />
        <Field label="Fielder / catcher" value="L. Dissanayake" />
        <Field label="New batter *" value="R. Herath" hint="Remaining XI shown first" />
        <div>
          <span className="field-label">Notes</span>
          <span className="input"><span className="ph">Optional — e.g. “edge to keeper”</span></span>
        </div>
      </div>
      <div style={{ marginTop: "auto", padding: 16, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <span className="btn btn-ghost btn-lg">Cancel</span>
        <span className="btn btn-danger btn-lg">Confirm wicket</span>
      </div>
    </div>
  );
}

Object.assign(window, { ScoringDesktop, ScoringMobile, WicketDialogMobile, ScorePad, ScoreSummary });
