// boards/match.jsx — Match details: desktop Dialog + mobile full-screen Sheet
function ModalTabs({ active, mobile }) {
  const tabs = ["Summary", "Scorecard", "Fall of Wickets", "Ball-by-Ball", "Info"];
  return (
    <div className="tabs tabs-underline" style={{ padding: mobile ? "0 16px" : "0 24px", gap: 0, overflow: "hidden" }}>
      {tabs.map(t => <span key={t} className="tab" {...(t === active ? { "data-active": "" } : {})} style={{ padding: mobile ? "11px 10px" : "11px 14px", fontSize: mobile ? 12.5 : 13 }}>{t}</span>)}
    </div>
  );
}

function ModalHeader({ mobile, sheet }) {
  return (
    <div style={{ padding: mobile ? "14px 16px" : "18px 24px", background: "var(--hero-grad)", color: "var(--on-ink)", borderRadius: sheet ? 0 : "16px 16px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 10 }}>
          <Badge type="live" />
          <span style={{ fontSize: 12, color: "var(--on-ink-muted)", fontWeight: 600 }}>Match 14 · T20</span>
        </span>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.12)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon d={IC.x} size={14} /></span>
      </div>
      <div className="row" style={{ justifyContent: "space-between", gap: 14 }}>
        <span className="row" style={{ gap: 10 }}>
          <TeamLogo t="SES" /><span className="t-score-md">162/8 <span style={{ fontSize: 13, fontWeight: 600, color: "var(--on-ink-muted)" }}>(20.0)</span></span>
        </span>
        <span style={{ fontFamily: "var(--font-display)", color: "var(--on-ink-muted)", fontWeight: 600 }}>VS</span>
        <span className="row" style={{ gap: 10 }}>
          <span className="t-score-md">147/4 <span style={{ fontSize: 13, fontWeight: 600, color: "var(--on-ink-muted)" }}>(16.3)</span></span><TeamLogo t="CST" />
        </span>
      </div>
      <span style={{ fontSize: 12, color: "var(--on-ink-muted)" }}>CS Titans need 16 runs off 21 balls · RRR 4.57</span>
    </div>
  );
}

function BattingTable({ mobile }) {
  const rows = [
    ["N. Jayawardena", "c Silva b Madushanka", 34, 28, 4, 1, "121.4"],
    ["R. Jayasuriya", "b Senanayake", 58, 41, 6, 2, "141.5"],
    ["L. Dissanayake", "run out (Perera)", 12, 10, 1, 0, "120.0"],
    ["M. Fernando", "c & b Herath", 21, 17, 2, 1, "123.5"],
    ["P. Gunawardena", "not out", 18, 14, 1, 1, "128.6"],
    ["D. Weerasinghe", "lbw b Madushanka", 4, 6, 0, 0, "66.7"],
  ];
  return (
    <table className="stat">
      <thead><tr>
        <th>Batter</th>{!mobile && <th></th>}<th className="num">R</th><th className="num">B</th><th className="num">4s</th><th className="num">6s</th><th className="num">SR</th>
      </tr></thead>
      <tbody>
        {rows.map(([n, how, r, b, f, s, sr]) => (
          <tr key={n}>
            <td style={{ fontWeight: 600 }}>{n}{mobile && <div style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>{how}</div>}</td>
            {!mobile && <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{how}</td>}
            <td className="num" style={{ fontWeight: 700 }}>{r}</td><td className="num">{b}</td><td className="num">{f}</td><td className="num">{s}</td><td className="num">{sr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BowlingTable() {
  const rows = [
    ["H. Madushanka", "4.0", 0, 28, 3, "7.00"],
    ["M. Senanayake", "4.0", 0, 31, 2, "7.75"],
    ["J. Herath", "4.0", 1, 24, 1, "6.00"],
    ["K. Perera", "4.0", 0, 36, 1, "9.00"],
    ["T. Silva", "4.0", 0, 39, 0, "9.75"],
  ];
  return (
    <table className="stat">
      <thead><tr><th>Bowler</th><th className="num">O</th><th className="num">M</th><th className="num">R</th><th className="num">W</th><th className="num">Econ</th></tr></thead>
      <tbody>
        {rows.map(([n, o, m, r, w, e]) => (
          <tr key={n}><td style={{ fontWeight: 600 }}>{n}</td><td className="num">{o}</td><td className="num">{m}</td><td className="num">{r}</td><td className="num" style={{ fontWeight: 700 }}>{w}</td><td className="num">{e}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function ScorecardTab({ mobile }) {
  return (
    <div style={{ padding: mobile ? 16 : 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 8 }}><TeamLogo t="SES" size="sm" /><span className="t-h3">SE Strikers — 1st innings</span></span>
        <span className="t-num" style={{ fontWeight: 700 }}>162/8 (20.0)</span>
      </div>
      <BattingTable mobile={mobile} />
      <div className="row" style={{ justifyContent: "space-between", background: "var(--surface-2)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
        <span><b>Extras</b> 15 <span style={{ color: "var(--text-muted)" }}>(WD 8, NB 2, B 1, LB 4)</span></span>
        <span className="t-num"><b>Total</b> 162/8 · 20 overs · RR 8.10</span>
      </div>
      <span className="t-h3">Bowling — CS Titans</span>
      <BowlingTable />
      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        <b style={{ color: "var(--text)" }}>Fall of wickets:</b> 1–42 (Jayawardena, 5.2) · 2–71 (Dissanayake, 8.4) · 3–104 (Jayasuriya, 12.1) · 4–133 (Fernando, 15.3) — <span style={{ color: "var(--primary)", fontWeight: 600 }}>full list in Fall of Wickets tab</span>
      </div>
    </div>
  );
}

function MatchModalDesktop() {
  return (
    <div style={{ background: "var(--background)", padding: "36px 0", minHeight: 980, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,35,.55)", backdropFilter: "blur(2px)" }}></div>
      <div className="card" style={{ position: "relative", width: 860, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-pop)", padding: 0 }}>
        <ModalHeader />
        <ModalTabs active="Scorecard" />
        <ScorecardTab />
      </div>
    </div>
  );
}

function SummaryTab({ mobile }) {
  return (
    <div style={{ padding: mobile ? 16 : 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ padding: 14, boxShadow: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-label">Status</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>CS Titans need 16 runs off 21 balls</span>
        <div className="row" style={{ gap: 8 }}><BallStrip balls={["1", "4", "0", "W", "6", "1"]} sm /><span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>last 6 balls</span></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}><Stat label="Toss" value="SE Strikers" sub="elected to bat" /></div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}><Stat label="Top scorer" value="R. Jayasuriya" sub="58 off 41" /></div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}><Stat label="Best bowling" value="H. Madushanka" sub="3/28 (4)" /></div>
        <div className="card" style={{ padding: 14, boxShadow: "none" }}><Stat label="Venue" value="University Grounds" sub="Kelaniya" /></div>
      </div>
      <div className="card" style={{ padding: 14, boxShadow: "none", borderColor: "var(--highlight)", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "var(--highlight)" }}><Icon d={IC.trophy} size={22} /></span>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span className="t-label">Player of the match</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Announced after the match ends</span>
        </span>
        <span className="t-label" style={{ marginLeft: "auto", textAlign: "right", fontSize: 9.5 }}>Presented by<br /><span style={{ color: "var(--text)", fontWeight: 700 }}>Sponsor</span></span>
      </div>
    </div>
  );
}

function MatchSheetMobile() {
  return (
    <div style={{ background: "var(--surface)", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <ModalHeader mobile sheet />
      <div style={{ position: "sticky", top: 0, background: "var(--surface)", borderBottom: "1px solid transparent" }}>
        <ModalTabs active="Summary" mobile />
      </div>
      <SummaryTab mobile />
      <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-h3">Ball-by-ball · Over 17</span>
        {[
          ["16.3", "1", "Fernando to Perera — pushed to long-on, single"],
          ["16.2", "6", "Fernando to Perera — launched over deep midwicket!"],
          ["16.1", "W", "Fernando to Bandara — caught at point"],
        ].map(([ov, b, txt]) => (
          <div key={ov} className="row" style={{ gap: 10 }}>
            <span className="t-num" style={{ fontSize: 11.5, color: "var(--text-muted)", width: 30, flex: "none" }}>{ov}</span>
            <Ball v={b} sm />
            <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>{txt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FowBoard() {
  const rows = [
    [1, "42/1", "5.2", "N. Jayawardena", "Caught", "H. Madushanka", "T. Silva"],
    [2, "71/2", "8.4", "L. Dissanayake", "Run out", "—", "K. Perera (direct hit)"],
    [3, "104/3", "12.1", "R. Jayasuriya", "Bowled", "M. Senanayake", "—"],
    [4, "133/4", "15.3", "M. Fernando", "Caught & bowled", "J. Herath", "—"],
  ];
  return (
    <div style={{ padding: 20 }}>
      <table className="stat">
        <thead><tr><th>Wkt</th><th>Score</th><th>Over</th><th>Player out</th><th>Type</th><th>Bowler</th><th>Fielder</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r[0]}>
              <td className="t-num" style={{ fontWeight: 700 }}>{r[0]}</td><td className="t-num">{r[1]}</td><td className="t-num">{r[2]}</td>
              <td style={{ fontWeight: 600 }}>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td>{r[6]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { MatchModalDesktop, MatchSheetMobile, FowBoard, ModalHeader, ModalTabs, ScorecardTab });
