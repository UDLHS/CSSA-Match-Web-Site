// boards/home.jsx — Home page: desktop (1280) + mobile (390)
function ArrowBtn({ dir, onClick, disabled }) {
  return (
    <span className="arrow-btn" onClick={disabled ? undefined : onClick} style={{ opacity: disabled ? .4 : 1, transform: dir === "l" ? "scaleX(-1)" : "none" }}>
      <ChevR />
    </span>
  );
}

function SiteHeader({ mobile }) {
  const links = ["Home", "Matches", "Players", "Leaderboard", "Popular"];
  return (
    <div className="row" style={{ justifyContent: "space-between", padding: mobile ? "12px 16px" : "14px 32px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <span className="row" style={{ gap: 10 }}>
        <img src="assets/logo.png" alt="CSSA Cricket Fiesta" style={{ width: mobile ? 34 : 40, height: mobile ? 34 : 40, borderRadius: 8, objectFit: "cover" }} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: mobile ? 17 : 19, letterSpacing: ".02em" }}>CRICKET FIESTA '26</span>
          <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: ".14em", color: "var(--text-muted)", textTransform: "uppercase" }}>CSSA · University of Kelaniya</span>
        </span>
      </span>
      {mobile ? (
        <span className="row" style={{ gap: 12, color: "var(--text)" }}>
          <Icon d={IC.sun} size={19} />
          <Icon d={IC.menu} size={21} />
        </span>
      ) : (
        <span className="row" style={{ gap: 26 }}>
          {links.map((l, i) => (
            <span key={l} style={{ fontSize: 13.5, fontWeight: 600, color: i === 0 ? "var(--primary)" : "var(--text-muted)", boxShadow: i === 0 ? "0 14px 0 -12px var(--primary)" : "none", paddingBottom: 2 }}>{l}</span>
          ))}
          <span className="row" style={{ gap: 14, marginLeft: 8 }}>
            <span style={{ color: "var(--text-muted)" }}><Icon d={IC.sun} size={18} /></span>
            <span className="btn btn-ghost btn-sm"><Icon d={IC.shield} size={14} /> Admin</span>
          </span>
        </span>
      )}
    </div>
  );
}

function HeroTeam({ t, score, overs, dim, mobile }) {
  return (
    <div className="row" style={{ gap: mobile ? 10 : 14, opacity: dim ? .82 : 1 }}>
      <TeamLogo t={t} size={mobile ? undefined : "lg"} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: mobile ? 13 : 14.5, fontWeight: 700, color: "var(--on-ink)" }}>{TEAMS[t].name}</span>
        <span className={mobile ? "t-score-lg" : "t-score-xl"} style={{ color: "var(--on-ink)" }}>
          {score}<span style={{ fontSize: mobile ? 17 : 24, fontWeight: 600, color: "var(--on-ink-muted)", marginLeft: 6 }}>{overs}</span>
        </span>
      </span>
    </div>
  );
}

function LiveHero({ mobile }) {
  const stats = [["Target", "163"], ["Need", "16 off 21"], ["CRR", "8.91"], ["RRR", "4.57"]];
  // role: bat = batting now, ball = bowling now
  const players = [
    ["Striker", "K. Perera", "52* (31)", "bat"],
    ["Non-striker", "T. Silva", "28* (19)", "bat"],
    ["Bowler", "M. Fernando", "2/24 · 3.3 ov", "ball"],
  ];
  return (
    <div style={{ background: "var(--hero-grad)", borderRadius: "var(--radius-lg)", padding: mobile ? 18 : "26px 30px", color: "var(--on-ink)", display: "flex", flexDirection: "column", gap: mobile ? 16 : 20, boxShadow: "var(--shadow-pop)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 10 }}>
          <Badge type="live" />
          <span style={{ fontSize: 12, color: "var(--on-ink-muted)", fontWeight: 600 }}>Match 14 · T20 · University Grounds</span>
        </span>
        {!mobile && <span style={{ fontSize: 12, color: "var(--on-ink-muted)" }}>SE Strikers won the toss & elected to bat</span>}
      </div>

      <div style={mobile
        ? { display: "flex", flexDirection: "column", gap: 14 }
        : { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 24 }}>
        <HeroTeam t="SES" score="162/8" overs="(20.0)" dim mobile={mobile} />
        {!mobile && <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--on-ink-muted)", textAlign: "center" }}>VS</span>}
        <HeroTeam t="CST" score="147/4" overs="(16.3)" mobile={mobile} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(4, 1fr)" : "repeat(4, auto)", gap: mobile ? 10 : 38, justifyContent: "start", background: "rgba(255,255,255,.07)", borderRadius: 12, padding: mobile ? "10px 14px" : "12px 22px" }}>
        {stats.map(([l, v]) => (
          <span key={l} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span className="t-label" style={{ color: "var(--on-ink-muted)" }}>{l}</span>
            <span className="t-num" style={{ fontSize: mobile ? 15 : 18, fontWeight: 700 }}>{v}</span>
          </span>
        ))}
      </div>

      <div style={mobile ? { display: "flex", flexDirection: "column", gap: 12 } : { display: "grid", gridTemplateColumns: "1fr auto", alignItems: "end", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, auto)", gap: mobile ? 10 : 26, justifyContent: "start" }}>
          {players.map(([role, name, fig, rt]) => (
            <span key={role} className="row" style={{ gap: 9 }}>
              <RoleIconDisc role={rt} size={22} />
              <span style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{name}</span>
                <span style={{ color: "var(--on-ink-muted)" }}> · {fig}</span>
              </span>
              <span className="t-label" style={{ color: "var(--on-ink-muted)", fontSize: 9.5 }}>{role}</span>
            </span>
          ))}
        </div>
        <div className="row" style={{ gap: 12, justifyContent: mobile ? "space-between" : "flex-end" }}>
          <BallStrip balls={["1", "4", "0", "W", "6", "1"]} sm={mobile} />
          <span className="btn btn-sm" style={{ background: "var(--highlight)", color: "#1F1500", fontWeight: 700 }}>Full scorecard <ChevR /></span>
        </div>
      </div>
      {mobile && <span style={{ fontSize: 11.5, color: "var(--on-ink-muted)" }}>SE Strikers won the toss & elected to bat</span>}
    </div>
  );
}

function MatchCard({ status, a, b, sa, sb, oa, ob, meta, result, mobile }) {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        {status === "live" ? <Badge type="live" /> : status === "upcoming" ? <Badge type="upcoming">Upcoming</Badge> : <Badge type="completed">Completed</Badge>}
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{meta}</span>
      </div>
      {[[a, sa, oa], [b, sb, ob]].map(([t, s, o]) => (
        <div key={t} className="row" style={{ justifyContent: "space-between" }}>
          <span className="row" style={{ gap: 9 }}>
            <TeamLogo t={t} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{TEAMS[t].name}</span>
          </span>
          <span className="t-num" style={{ fontWeight: 700, fontSize: 15 }}>
            {s} <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>{o}</span>
          </span>
        </div>
      ))}
      <div className="divider"></div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: status === "completed" ? "var(--success)" : "var(--text-muted)", fontWeight: 600 }}>{result}</span>
        <span style={{ color: "var(--primary)" }}><ChevR /></span>
      </div>
    </div>
  );
}

// ---- Swipeable matches: Previous ← Live → Upcoming ----
function MatchesSection({ mobile }) {
  const ref = React.useRef(null);
  const [active, setActive] = React.useState(1);
  React.useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.clientWidth; // center the Live slide on load
  }, []);
  const go = (i) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  };
  const onScroll = () => {
    const el = ref.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };
  const tabs = ["Previous", "Live", "Upcoming"];

  const previous = [
    <MatchCard key="p1" status="completed" a="AIB" b="NSC" sa="171/6" sb="148" oa="(20.0)" ob="(18.4)" meta="Jun 9 · Main Ground" result="AI Blazers won by 23 runs" mobile={mobile} />,
    <MatchCard key="p2" status="completed" a="DSD" b="SES" sa="156/5" sb="154/9" oa="(19.2)" ob="(20.0)" meta="Jun 8 · University Grounds" result="DS Dynamos won by 5 wickets" mobile={mobile} />,
    <MatchCard key="p3" status="completed" a="ISW" b="CST" sa="139" sb="157/7" oa="(19.1)" ob="(20.0)" meta="Jun 7 · Main Ground" result="CS Titans won by 18 runs" mobile={mobile} />,
  ];
  const live = [
    <MatchCard key="l1" status="live" a="SES" b="CST" sa="162/8" sb="147/4" oa="(20.0)" ob="(16.3)" meta="University Grounds" result="CS Titans need 16 off 21 balls" mobile={mobile} />,
    <MatchCard key="l2" status="live" a="AIB" b="ISW" sa="88/2" sb="—" oa="(9.4)" ob="" meta="Main Ground" result="AI Blazers batting · 1st innings" mobile={mobile} />,
  ];
  const upcoming = [
    <MatchCard key="u1" status="upcoming" a="DSD" b="ISW" sa="—" sb="—" oa="" ob="" meta="Jun 12 · 2:00 PM" result="Match 15 · T20 · Main Ground" mobile={mobile} />,
    <MatchCard key="u2" status="upcoming" a="AIB" b="NSC" sa="—" sb="—" oa="" ob="" meta="Jun 12 · 6:30 PM" result="Match 16 · T20 · University Grounds" mobile={mobile} />,
    <MatchCard key="u3" status="upcoming" a="CST" b="DSD" sa="—" sb="—" oa="" ob="" meta="Jun 13 · 2:00 PM" result="Match 17 · Semi-final · Main Ground" mobile={mobile} />,
  ];
  const Slide = ({ cards }) => (
    <div className="slide"><div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)", gap: 14, alignContent: "start" }}>{cards}</div></div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="t-h2">Matches</span>
        <span className="row" style={{ gap: 10 }}>
          <span className="tabs">
            {tabs.map((t, i) => <span key={t} className="tab" {...(i === active ? { "data-active": "" } : {})} onClick={() => go(i)} style={{ cursor: "pointer" }}>{t}</span>)}
          </span>
          {!mobile && (
            <span className="row" style={{ gap: 6 }}>
              <ArrowBtn dir="l" disabled={active === 0} onClick={() => go(Math.max(0, active - 1))} />
              <ArrowBtn dir="r" disabled={active === 2} onClick={() => go(Math.min(2, active + 1))} />
            </span>
          )}
        </span>
      </div>

      <div ref={ref} className="swipe" onScroll={onScroll} style={{ margin: "0 -4px", padding: "0 4px" }}>
        <Slide cards={previous} />
        <Slide cards={live} />
        <Slide cards={upcoming} />
      </div>

      <div className="row" style={{ justifyContent: "center", gap: 8 }}>
        {tabs.map((t, i) => (
          <span key={t} onClick={() => go(i)} style={{ width: i === active ? 22 : 7, height: 7, borderRadius: 999, background: i === active ? "var(--primary)" : "var(--border)", transition: "all .2s", cursor: "pointer" }}></span>
        ))}
      </div>
      {mobile && (
        <div className="row" style={{ justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
          <span>← Swipe for previous</span><span>upcoming →</span>
        </div>
      )}
    </div>
  );
}

function LeaderPreview({ mobile }) {
  const rows = [
    [1, "K. Perera", "CST", "246"], [2, "R. Jayasuriya", "SES", "231"], [3, "D. Bandara", "AIB", "204"],
    [4, "S. Rathnayake", "DSD", "188"], [5, "A. Wickramasinghe", "ISW", "175"],
  ];
  return (
    <div className="card" style={{ padding: mobile ? 16 : 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="t-h3">Leaderboard</span>
        <span className="tabs">
          <span className="tab" data-active="">Batting</span><span className="tab">Bowling</span><span className="tab">Overall</span>
        </span>
      </div>
      <div>
        {rows.map(([r, n, t, v]) => (
          <div key={r} className="row" style={{ gap: 12, padding: "9px 0", borderBottom: r < 5 ? "1px solid var(--border)" : "none" }}>
            <span className="t-num" style={{ width: 18, fontWeight: 700, color: r === 1 ? "var(--highlight)" : "var(--text-muted)", fontSize: 14 }}>{r}</span>
            <RoleAvatar name={n} size={32} color={TEAMS[t].color} role="bat" />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{n}</span>
              <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--text-muted)" }}><TeamLogo t={t} size="sm" />{TEAMS[t].name}</span>
            </span>
            <span className="t-num" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 16 }}>{v}<span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", marginLeft: 4 }}>RUNS</span></span>
          </div>
        ))}
      </div>
      <span className="btn btn-soft btn-sm" style={{ alignSelf: "stretch", justifyContent: "center" }}>View full leaderboard</span>
    </div>
  );
}

function PopularCard({ rank, name, t, role, votes, big }) {
  const rankBg = rank === 1 ? "var(--highlight)" : rank === 2 ? "#94A3B8" : "#B97A56";
  const rt = role === "Bowler" ? "ball" : role === "Keeper" ? "field" : "bat";
  return (
    <div className="card" style={{ padding: big ? 18 : 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", borderColor: rank === 1 ? "var(--highlight)" : "var(--border)" }}>
      <span className="t-num" style={{ position: "absolute", top: 10, left: 10, width: 24, height: 24, borderRadius: "50%", background: rankBg, color: "#1F1500", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{rank}</span>
      <RoleAvatar name={name} size={big ? 64 : 48} color={TEAMS[t].color} role={rt} />
      <span style={{ fontSize: big ? 15 : 13.5, fontWeight: 700, textAlign: "center" }}>{name}</span>
      <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--text-muted)" }}><TeamLogo t={t} size="sm" />{TEAMS[t].name}</span>
      <span className="badge badge-upcoming" style={{ fontSize: 10 }}>{role}</span>
      <span className="t-num" style={{ fontWeight: 800, fontSize: big ? 22 : 17 }}>{votes}<span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", marginLeft: 4 }}>VOTES</span></span>
    </div>
  );
}

function PopularPlayers({ mobile }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="t-h2">Popular players</span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>★ Official popularity ranking</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 14 }}>
        <div style={mobile ? { gridColumn: "1 / -1" } : {}}><PopularCard rank={1} name="K. Perera" t="CST" role="Batter" votes="342" big /></div>
        <PopularCard rank={2} name="M. Fernando" t="SES" role="Bowler" votes="318" big={!mobile} />
        <PopularCard rank={3} name="D. Bandara" t="AIB" role="All-rounder" votes="296" big={!mobile} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
        <PopularCard rank={4} name="S. Rathnayake" t="DSD" role="Batter" votes="241" />
        <PopularCard rank={5} name="A. Wickramasinghe" t="ISW" role="Keeper" votes="212" />
        {!mobile && <PopularCard rank={6} name="P. Gunawardena" t="NSC" role="Bowler" votes="187" />}
        {!mobile && <PopularCard rank={7} name="L. Dissanayake" t="SES" role="All-rounder" votes="165" />}
      </div>
    </div>
  );
}

function SiteFooter({ mobile }) {
  const partners = ["Title Sponsor", "Co-Sponsor", "Beverage Partner", "Media Partner", "Campus Store"];
  return (
    <div style={{ background: "var(--ink)", color: "var(--on-ink-muted)", padding: mobile ? "20px 16px" : "26px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-label" style={{ color: "var(--on-ink-muted)" }}>Our partners</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {partners.map(p => (
            <span key={p} style={{ height: 38, padding: "0 16px", borderRadius: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--on-ink)" }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(255,255,255,.18)" }}></span>{p}
            </span>
          ))}
        </div>
      </div>
      <div className="divider" style={{ background: "rgba(255,255,255,.12)" }}></div>
      <div className="row" style={{ flexDirection: mobile ? "column" : "row", gap: 10, alignItems: mobile ? "flex-start" : "center", justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 10 }}>
          <img src="assets/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--on-ink)" }}>CSSA CRICKET FIESTA '26</span>
        </span>
        <span style={{ fontSize: 12 }}>© 2026 Computer Science Students' Association · University of Kelaniya</span>
      </div>
    </div>
  );
}

function HomeDesktop() {
  return (
    <div className="cf-page" style={{ background: "var(--background)", minHeight: "100%" }}>
      <SiteHeader />
      <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: 26 }}>
        <LiveHero />
        <SponsorSlot variant="leaderboard" />
        <MatchesSection />
        <div style={{ display: "grid", gridTemplateColumns: "5fr 176px 7fr", gap: 20, alignItems: "stretch" }}>
          <div style={{ alignSelf: "start" }}><LeaderPreview /></div>
          <SponsorSlot variant="skyscraper" />
          <div style={{ alignSelf: "start" }}><PopularPlayers /></div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function HomeMobile() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100%" }}>
      <SiteHeader mobile />
      <div style={{ padding: "14px 14px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
        <LiveHero mobile />
        <SponsorSlot variant="banner" />
        <MatchesSection mobile />
        <LeaderPreview mobile />
        <SponsorSlot variant="banner" />
        <PopularPlayers mobile />
      </div>
      <SiteFooter mobile />
    </div>
  );
}

Object.assign(window, { SiteHeader, LiveHero, MatchesSection, LeaderPreview, PopularPlayers, PopularCard, SiteFooter, HomeDesktop, HomeMobile, MatchCard, ArrowBtn });
