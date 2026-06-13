// boards/admin.jsx — Admin layout + dashboard
function AdminSidebar({ active }) {
  const items = [
    ["Dashboard", IC.grid], ["Teams", IC.shield], ["Players", IC.users], ["Matches", IC.trophy],
    ["Venues", IC.pin], ["Live Scoring", IC.bolt], ["Popular Votes", IC.vote],
    ["Sponsors & Ads", IC.image], ["Leaderboard", IC.refresh],
    ["Admin Users", IC.user], ["Audit Logs", IC.logs], ["Settings", IC.gear],
  ];
  return (
    <div style={{ width: 220, flex: "none", background: "var(--ink)", color: "var(--on-ink-muted)", display: "flex", flexDirection: "column", padding: "18px 12px", gap: 4, minHeight: "100%" }}>
      <div className="row" style={{ gap: 9, padding: "0 8px 16px" }}>
        <img src="assets/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--on-ink)" }}>FIESTA ADMIN</span>
          <span style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase" }}>Scoring console</span>
        </span>
      </div>
      {items.map(([l, ic]) => (
        <span key={l} className="row" style={{ gap: 10, padding: "9px 10px", borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: l === active ? "rgba(255,255,255,.12)" : "transparent",
          color: l === active ? "var(--on-ink)" : "var(--on-ink-muted)",
          boxShadow: l === active ? "inset 3px 0 0 var(--highlight)" : "none" }}>
          <Icon d={ic} size={16} />{l}
          {l === "Live Scoring" && l !== active ? <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "var(--live)" }}></span> : null}
        </span>
      ))}
    </div>
  );
}

function AdminTopbar({ title, mobile }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: mobile ? "12px 14px" : "14px 24px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <span className="row" style={{ gap: 10 }}>
        {mobile && <Icon d={IC.menu} size={20} />}
        <span className="t-h3">{title}</span>
      </span>
      <span className="row" style={{ gap: 12 }}>
        <span style={{ color: "var(--text-muted)" }}><Icon d={IC.sun} size={17} /></span>
        <span className="row" style={{ gap: 8 }}>
          <Avatar name="Sahan A" size={28} color="var(--primary)" />
          {!mobile && <span style={{ fontSize: 12.5, fontWeight: 600 }}>Sahan · Scorer</span>}
        </span>
        {!mobile && <span className="btn btn-ghost btn-sm">Logout</span>}
      </span>
    </div>
  );
}

function AdminDashboard() {
  const stats = [["Matches", "14", "2 live today"], ["Teams", "6", "all XI confirmed"], ["Players", "84", "6 photos missing"], ["Total balls logged", "3,182", "last: 16.3 ov, Match 14"]];
  return (
    <div style={{ display: "flex", background: "var(--background)", minHeight: "100%" }}>
      <AdminSidebar active="Dashboard" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <AdminTopbar title="Dashboard" />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {stats.map(([l, v, s]) => (
              <div key={l} className="card" style={{ padding: "16px 18px" }}>
                <span className="t-label">{l}</span>
                <div className="t-num" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, lineHeight: 1.15 }}>{v}</div>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, borderColor: "var(--live)" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="row" style={{ gap: 10 }}><Badge type="live" /><span style={{ fontWeight: 700, fontSize: 14 }}>Match 14 — SE Strikers vs CS Titans</span></span>
              <span className="btn btn-primary btn-sm"><Icon d={IC.bolt} size={14} /> Open scoring console</span>
            </div>
            <div className="row" style={{ gap: 24 }}>
              <span className="t-score-md t-num">147/4 <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>(16.3 / 20)</span></span>
              <BallStrip balls={["1", "4", "0", "W", "6", "1"]} sm />
              <span style={{ fontSize: 12.5, color: "var(--text-muted)", marginLeft: "auto" }}>Target 163 · need 16 off 21</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 14 }}>
            <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="t-h3" style={{ marginBottom: 6 }}>Today's fixtures</span>
              {[["Match 14", "SES vs CST", "Live — 2nd innings", "live"], ["Match 15", "DSD vs ISW", "2:00 PM · Main Ground", "upcoming"], ["Match 16", "AIB vs NSC", "6:30 PM · Main Ground", "upcoming"]].map(([m, t, s, st]) => (
                <div key={m} className="row" style={{ gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)", width: 60, flex: "none" }}>{m}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</span>
                  <span style={{ marginLeft: "auto" }}>{st === "live" ? <Badge type="live" /> : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s}</span>}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="t-h3" style={{ marginBottom: 6 }}>Recent audit log</span>
              {[["16.3", "Ball logged: 1 run", "Sahan · 12s ago"], ["16.2", "Ball edited: 4 → 6", "Sahan · 1m ago"], ["—", "Innings 2 started", "Ruwan · 34m ago"]].map(([ov, a, w], i) => (
                <div key={i} className="row" style={{ gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span className="t-num" style={{ color: "var(--text-muted)", width: 30, flex: "none" }}>{ov}</span>
                  <span style={{ fontWeight: 600 }}>{a}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 11.5 }}>{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamFormBoard() {
  return (
    <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, background: "var(--surface)" }}>
      <span className="t-h3">New team</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div><span className="field-label">Team name *</span><span className="input"><span>DS Dynamos</span></span></div>
        <div><span className="field-label">Short name * <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(≤4 chars)</span></span><span className="input"><span>DSD</span></span></div>
      </div>
      <div>
        <span className="field-label">Logo</span>
        <div style={{ border: "1.5px dashed var(--border)", borderRadius: 12, padding: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <TeamLogo t="DSD" />
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Drop PNG/SVG here or <span style={{ color: "var(--primary)", fontWeight: 600 }}>browse</span> · falls back to monogram</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <span className="field-label">Primary color *</span>
          <span className="input" style={{ gap: 10 }}><span style={{ width: 18, height: 18, borderRadius: 5, background: "#0D9488", flex: "none" }}></span><span className="t-num">#0D9488</span></span>
          <span className="field-hint">Checked for 4.5:1 contrast against white score text.</span>
        </div>
        <div>
          <span className="field-label">Secondary color</span>
          <span className="input is-error" style={{ gap: 10 }}><span style={{ width: 18, height: 18, borderRadius: 5, background: "#E8FFF9", flex: "none", border: "1px solid var(--border)" }}></span><span className="t-num">#E8FFF9</span></span>
          <span className="field-error">Too light — fails contrast on light surfaces. Try #0F766E.</span>
        </div>
      </div>
      <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
        <span className="btn btn-ghost">Cancel</span><span className="btn btn-primary">Save team</span>
      </div>
    </div>
  );
}

Object.assign(window, { AdminSidebar, AdminTopbar, AdminShell, AdminDashboard, TeamFormBoard });

function AdminShell({ active, title, crumb, children }) {
  return (
    <div style={{ display: "flex", background: "var(--background)", minHeight: "100%" }}>
      <AdminSidebar active={active} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AdminTopbar title={title} />
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>
      </div>
    </div>
  );
}
Object.assign(window, { AdminShell });
