// boards/shared.jsx — shared data + atoms for Cricket Fiesta mockups
const TEAMS = {
  CST: { code: "CST", name: "CS Titans",    color: "#4338CA" },
  SES: { code: "SES", name: "SE Strikers",  color: "#EA580C" },
  DSD: { code: "DSD", name: "DS Dynamos",   color: "#0D9488" },
  ISW: { code: "ISW", name: "IS Warriors",  color: "#BE185D" },
  AIB: { code: "AIB", name: "AI Blazers",   color: "#7C3AED" },
  NSC: { code: "NSC", name: "Net Chargers", color: "#B45309" },
};

function TeamLogo({ t, size }) {
  const cls = "tlogo" + (size === "lg" ? " tlogo-lg" : size === "sm" ? " tlogo-sm" : "");
  return <span className={cls} style={{ background: TEAMS[t].color }}>{TEAMS[t].code}</span>;
}

function Badge({ type, children }) {
  if (type === "live") return <span className="badge badge-live"><span className="pulse"></span>LIVE</span>;
  const map = { upcoming: "badge-upcoming", completed: "badge-completed", break: "badge-break", abandoned: "badge-abandoned", freehit: "badge-freehit" };
  return <span className={"badge " + (map[type] || "badge-upcoming")}>{children}</span>;
}

// v: "0" "1" "2" "3" "4" "6" "W" "WD" "NB" "·"
function Ball({ v, sm }) {
  let cls = "ball";
  if (v === "4") cls += " ball-four";
  else if (v === "6") cls += " ball-six";
  else if (v === "W") cls += " ball-w";
  else if (v === "WD" || v === "NB") cls += " ball-" + v.toLowerCase();
  else if (v !== "0" && v !== "·") cls += " ball-run";
  if (sm) cls += " ball-sm";
  return <span className={cls}>{v === "0" ? "•" : v}</span>;
}

function BallStrip({ balls, sm }) {
  return <span className="ball-strip">{balls.map((b, i) => <Ball key={i} v={b} sm={sm} />)}</span>;
}

function Avatar({ name, size, color }) {
  const init = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  const s = size || 40;
  return (
    <span className="avatar" style={{ width: s, height: s, fontSize: s * 0.34, background: color ? color + "22" : undefined, color: color || undefined, borderColor: color ? color + "55" : undefined }}>{init}</span>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="t-label">{label}</span>
      <span className="t-num" style={{ fontSize: 16, fontWeight: 700 }}>{value}</span>
      {sub ? <span className="t-small" style={{ color: "var(--text-muted)" }}>{sub}</span> : null}
    </div>
  );
}

function ChevR() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ d, size }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const IC = {
  search: "M21 21l-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  menu: "M4 6h16M4 12h16M4 18h16",
  undo: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  pin: "M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  trophy: "M8 21h8m-4-4v4m-6-17h12v5a6 6 0 0 1-12 0V4Zm-3 2h3m12 0h3m-18 0a3 3 0 0 0 3 3m15-3a3 3 0 0 1-3 3",
  user: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  users: "M17 21v-2a4 4 0 0 0-3-3.9M9 21H3v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2H9Zm7-10a4 4 0 1 0-3.5-6M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  vote: "M7 11l3 3 7-8M5 21h14a1 1 0 0 0 1-1v-5H4v5a1 1 0 0 0 1 1Z",
  logs: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  shield: "M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  image: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 11 4.5-4.5 3 3L16 9l5 5M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.5 13.6a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.5a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1.6a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.5 7.5a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1.6a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H22.4a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z",
  calendar: "M7 2v3M17 2v3M3.5 9h17M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  upload: "M12 16V4m0 0L7 9m5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  download: "M12 4v12m0 0 5-5m-5 5-5-5M4 18v2h16v-2",
  dots: "M12 5h.01M12 12h.01M12 19h.01",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  check2: "M5 12l4.5 4.5L19 7",
  tag: "M3 3h7l11 11-7 7L3 10V3Z M7.5 7.5h.01",
  link: "M9 15l6-6M10.5 6.5l1.8-1.8a4 4 0 0 1 5.6 5.6L16.1 12M7.9 12l-1.8 1.8a4 4 0 0 0 5.6 5.6l1.8-1.8",
  play: "M7 4l12 8-12 8V4Z",
  save: "M5 4h10l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M8 4v5h7M8 14h8v6H8z",
  dollar: "M12 2v20M16 6.5C16 4.6 14.2 3.5 12 3.5S8 4.6 8 6.5 9.8 9.5 12 9.5s4 1.4 4 3.5-1.8 3-4 3-4-1.1-4-3",
  lock: "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Zm2 0V8a4 4 0 0 1 8 0v3",
  copy: "M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
};

// ---- Cricket role glyphs ----
function CricketBall({ size }) {
  const s = size || 13;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8.7 4.9C10.8 8 10.8 16 8.7 19.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.6 7.1l1.3.5M6 9.5l1.4.4M5.8 12h1.5M6 14.5l1.4-.4M6.6 16.9l1.3-.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
function CricketBat({ size }) {
  const s = size || 13;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.6 18.4 12.2 11.8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M13.4 10.6 17.9 6.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
// role: "bat" | "ball" | "field"
function RoleGlyph({ role, size }) {
  if (role === "ball") return <CricketBall size={size} />;
  return <CricketBat size={size} />;
}
// Standalone colored disc (for dark backgrounds / inline use)
function RoleIconDisc({ role, size }) {
  const s = size || 22;
  const cls = "role-disc " + (role || "field");
  return (
    <span className={cls} style={{ width: s, height: s }}>
      {role === "field" ? <Icon d={IC.user} size={s * 0.56} /> : <RoleGlyph role={role} size={s * 0.6} />}
    </span>
  );
}
// Avatar with role badge in the corner — used on the player everywhere
function RoleAvatar({ name, size, color, role }) {
  const s = size || 40;
  const bs = Math.max(15, Math.round(s * 0.46));
  return (
    <span className="role-av">
      <Avatar name={name} size={s} color={color} />
      {role && role !== "field" ? (
        <span className={"role-badge " + role} style={{ width: bs, height: bs }}>
          <RoleGlyph role={role} size={bs * 0.62} />
        </span>
      ) : null}
    </span>
  );
}

// Sponsor inventory slot — fed by the sponsors/ad table; placeholder until filled
function SponsorSlot({ variant, dims }) {
  const sky = variant === "skyscraper";
  const label = dims || (variant === "leaderboard" ? "Leaderboard · 728×90" : sky ? "Skyscraper · 160×600" : "Banner · 320×100");
  return (
    <div style={{
      position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
      minHeight: variant === "leaderboard" ? 104 : variant === "banner" ? 90 : 0, height: sky ? "100%" : undefined,
      display: "flex", flexDirection: sky ? "column" : "row", alignItems: "center", justifyContent: "center",
      gap: 14, overflow: "hidden", padding: sky ? "26px 16px" : "0 22px",
      backgroundImage: "repeating-linear-gradient(135deg, transparent 0 14px, color-mix(in oklab, var(--surface-2) 60%, transparent) 14px 15px)",
    }}>
      <span className="sponsor-tag">Sponsor slot</span>
      <span style={{ width: sky ? 56 : 46, height: sky ? 56 : 46, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flex: "none" }}>
        <Icon d={IC.image} size={sky ? 24 : 22} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: sky ? "center" : "flex-start", gap: 2, textAlign: sky ? "center" : "left" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Your brand here</span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{label}</span>
      </span>
    </div>
  );
}

Object.assign(window, { TEAMS, TeamLogo, Badge, Ball, BallStrip, Avatar, Stat, ChevR, Icon, IC, CricketBall, CricketBat, RoleGlyph, RoleIconDisc, RoleAvatar, SponsorSlot });
