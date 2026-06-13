// boards/leaderboard.jsx — Leaderboard page (desktop table + mobile cards) + player modal
const LB_ROWS = [
  [1, "K. Perera", "CST", 7, 246, 168, "146.4", "41.0", 24, 11, "78*"],
  [2, "R. Jayasuriya", "SES", 7, 231, 172, "134.3", "33.0", 26, 8, "64"],
  [3, "D. Bandara", "AIB", 6, 204, 159, "128.3", "40.8", 19, 7, "71"],
  [4, "S. Rathnayake", "DSD", 7, 188, 150, "125.3", "26.9", 17, 6, "55"],
  [5, "A. Wickramasinghe", "ISW", 6, 175, 142, "123.2", "29.2", 15, 5, "62*"],
  [6, "T. Silva", "CST", 7, 169, 131, "129.0", "28.2", 14, 6, "49"],
  [7, "P. Gunawardena", "NSC", 6, 152, 128, "118.8", "25.3", 13, 4, "47"],
  [8, "L. Dissanayake", "SES", 7, 140, 119, "117.6", "20.0", 12, 3, "44"],
];

function LbToolbar({ mobile }) {
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 10, alignItems: mobile ? "stretch" : "center" }}>
      <span className="input" style={{ flex: mobile ? "none" : "0 0 260px" }}>
        <span style={{ color: "var(--text-muted)" }}><Icon d={IC.search} size={15} /></span><span className="ph">Search player…</span>
      </span>
      <span className="input" style={{ flex: mobile ? "none" : "0 0 170px", justifyContent: "space-between" }}>
        <span>All teams</span><ChevR />
      </span>
      <span className="tabs" style={{ marginLeft: mobile ? 0 : "auto", alignSelf: mobile ? "flex-start" : "auto" }}>
        <span className="tab" data-active="">Batting</span><span className="tab">Bowling</span><span className="tab">Overall</span>
      </span>
    </div>
  );
}

function LeaderboardDesktop() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100%" }}>
      <SiteHeader />
      <div style={{ padding: "24px 32px 36px", display: "flex", flexDirection: "column", gap: 18 }}>
        <span className="t-display">Leaderboard</span>
        <LbToolbar />
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="stat">
            <thead><tr>
              <th style={{ width: 50 }}>Rank</th><th>Player</th><th>Team</th>
              <th className="num">M</th><th className="num">Runs</th><th className="num">Balls</th><th className="num">SR</th><th className="num">Avg</th><th className="num">4s</th><th className="num">6s</th><th className="num">HS</th>
            </tr></thead>
            <tbody>
              {LB_ROWS.map((r, i) => (
                <tr key={r[0]} className={i === 0 ? "hl" : ""}>
                  <td className="t-num" style={{ fontWeight: 800, color: r[0] <= 3 ? "var(--highlight)" : "var(--text-muted)" }}>{r[0]}</td>
                  <td><span className="row" style={{ gap: 9 }}><RoleAvatar name={r[1]} size={28} color={TEAMS[r[2]].color} role="bat" /><span style={{ fontWeight: 600 }}>{r[1]}</span></span></td>
                  <td><span className="row" style={{ gap: 6, fontSize: 12, color: "var(--text-muted)" }}><TeamLogo t={r[2]} size="sm" />{TEAMS[r[2]].name}</span></td>
                  <td className="num">{r[3]}</td><td className="num" style={{ fontWeight: 700 }}>{r[4]}</td><td className="num">{r[5]}</td>
                  <td className="num">{r[6]}</td><td className="num">{r[7]}</td><td className="num">{r[8]}</td><td className="num">{r[9]}</td><td className="num">{r[10]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>The bat badge marks the Batting tab; switching to Bowling swaps it to a ball. Mobile collapses this table into ranking cards — Rank, Player, Team and Runs stay visible; M · Balls · SR · Avg · 4s · 6s · HS move into the expandable details row.</span>
      </div>
    </div>
  );
}

function LbCardMobile({ r, expanded }) {
  return (
    <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "none" }}>
      <div className="row" style={{ gap: 11 }}>
        <span className="t-num" style={{ width: 20, fontWeight: 800, fontSize: 15, color: r[0] <= 3 ? "var(--highlight)" : "var(--text-muted)" }}>{r[0]}</span>
        <RoleAvatar name={r[1]} size={36} color={TEAMS[r[2]].color} role="bat" />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r[1]}</span>
          <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--text-muted)" }}><TeamLogo t={r[2]} size="sm" />{TEAMS[r[2]].name}</span>
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="t-num" style={{ fontWeight: 800, fontSize: 18 }}>{r[4]}<span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginLeft: 3 }}>RUNS</span></span>
          <span style={{ color: "var(--text-muted)", transform: expanded ? "rotate(90deg)" : "none", display: "inline-flex" }}><ChevR /></span>
        </span>
      </div>
      {expanded && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
          {[["M", r[3]], ["Balls", r[5]], ["SR", r[6]], ["Avg", r[7]], ["4s", r[8]], ["6s", r[9]], ["HS", r[10]], ["Pts", "—"]].map(([l, v]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span className="t-label" style={{ fontSize: 9.5 }}>{l}</span>
              <span className="t-num" style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardMobile() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100%" }}>
      <SiteHeader mobile />
      <div style={{ padding: "16px 14px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="t-display" style={{ fontSize: 28 }}>Leaderboard</span>
        <LbToolbar mobile />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LB_ROWS.slice(0, 2).map(r => <LbCardMobile key={r[0]} r={r} />)}
          <LbCardMobile r={LB_ROWS[2]} expanded />
          {LB_ROWS.slice(3, 6).map(r => <LbCardMobile key={r[0]} r={r} />)}
        </div>
      </div>
    </div>
  );
}

function PlayerModalDesktop() {
  return (
    <div style={{ background: "var(--background)", padding: "40px 0", minHeight: 760, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,35,.55)" }}></div>
      <div className="card" style={{ position: "relative", width: 680, margin: "0 auto", borderRadius: 16, overflow: "hidden", padding: 0, boxShadow: "var(--shadow-pop)" }}>
        <div style={{ background: "var(--hero-grad)", color: "var(--on-ink)", padding: "22px 26px", display: "flex", gap: 18, alignItems: "center" }}>
          <RoleAvatar name="K. Perera" size={84} color="#fff" role="bat" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <span className="t-display" style={{ fontSize: 30, color: "var(--on-ink)" }}>Kasun Perera</span>
            <span className="row" style={{ gap: 8, fontSize: 13, color: "var(--on-ink-muted)" }}>
              <TeamLogo t="CST" size="sm" /> CS Titans
              <span className="dot-sep"></span> Right-hand bat
              <span className="dot-sep"></span> Off-spin
            </span>
            <span className="row" style={{ gap: 8 }}>
              <span className="badge" style={{ background: "var(--highlight)", color: "#1F1500" }}>Batter</span>
              <span className="badge" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>★ 342 votes</span>
            </span>
          </div>
          <span style={{ alignSelf: "flex-start", width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.12)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon d={IC.x} size={14} /></span>
        </div>
        <div className="tabs tabs-underline" style={{ padding: "0 26px" }}>
          {["Overview", "Batting", "Bowling", "Recent Matches"].map((t, i) => <span key={t} className="tab" {...(i === 0 ? { "data-active": "" } : {})}>{t}</span>)}
        </div>
        <div style={{ padding: 26, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[["Runs", "246", "7 matches"], ["Strike rate", "146.4", "tournament best"], ["Average", "41.0", "3 not-outs"],
            ["Wickets", "4", "econ 7.9"], ["High score", "78*", "vs SE Strikers"], ["Votes", "342", "rank #1"]].map(([l, v, s]) => (
            <div key={l} className="card" style={{ padding: "14px 16px", boxShadow: "none" }}>
              <span className="t-label">{l}</span>
              <div className="t-num" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{v}</div>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatesBoard() {
  return (
    <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
      <div className="card" style={{ padding: 20, boxShadow: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Icon d={IC.clock} size={20} /></span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>No live matches right now</span>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Next match: DS Dynamos vs IS Warriors, Jun 12 · 2:00 PM</span>
        <span className="btn btn-soft btn-sm">View schedule</span>
      </div>
      <div className="card" style={{ padding: 20, boxShadow: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-label">Loading scorecard</span>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="row" style={{ gap: 10 }}>
            <span className="skl" style={{ width: 26, height: 26, borderRadius: "50%" }}></span>
            <span className="skl" style={{ width: 90 + i * 14, height: 12 }}></span>
            <span className="skl" style={{ width: 40, height: 12, marginLeft: "auto" }}></span>
          </div>
        ))}
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Skeletons mirror final row height — zero layout shift when data lands.</span>
      </div>
      <div className="card" style={{ padding: 20, boxShadow: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", borderColor: "color-mix(in oklab, var(--danger) 40%, var(--border))" }}>
        <span style={{ width: 44, height: 44, borderRadius: "50%", background: "color-mix(in oklab, var(--danger) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}><Icon d={IC.alert} size={20} /></span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Couldn't load the scorecard</span>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Check your connection. Live data resumes automatically.</span>
        <span className="btn btn-ghost btn-sm"><Icon d={IC.refresh} size={13} /> Retry</span>
      </div>
    </div>
  );
}

Object.assign(window, { LeaderboardDesktop, LeaderboardMobile, PlayerModalDesktop, StatesBoard, LbToolbar });
