// boards/admin-content.jsx — Sponsors & Ads, Popular Votes, Leaderboard rebuild
const SPONSORS = [
  ["Apex Telecom", "Title sponsor", "apextel.lk", "Active"],
  ["BrightPay", "Co-sponsor", "brightpay.lk", "Active"],
  ["ZilCola", "Beverage partner", "zilcola.com", "Active"],
  ["Campus Press", "Media partner", "campuspress.lk", "Active"],
  ["UniMart", "Partner", "unimart.lk", "Pending"],
];
const AD_SLOTS = [
  ["Home · Leaderboard banner", "728×90", "Apex Telecom", "Jun 1 – Jun 30", "8,420", true],
  ["Home · Skyscraper", "160×600", "BrightPay", "Jun 5 – Jun 20", "5,110", true],
  ["Match page · In-feed banner", "320×100", "ZilCola", "Jun 1 – Jun 15", "12,090", true],
  ["Footer · Partners strip", "Logos", "5 partners", "Always on", "—", true],
  ["Leaderboard · Banner", "728×90", "— empty —", "Not scheduled", "—", false],
];

function SponsorsAdsScreen() {
  return (
    <AdminShell active="Sponsors & Ads" title="Sponsors & Ads">
      <PageHead title="Sponsors & ads" sub="Manage sponsors and load creatives into any ad slot — admin controls placement, schedule & rotation"
        actions={<><span className="btn btn-ghost btn-sm"><Icon d={IC.plus} size={14} /> Add sponsor</span><span className="btn btn-primary"><Icon d={IC.upload} size={15} /> Load new ad</span></>} />

      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 16, alignItems: "start" }}>
        <Panel title="Ad placements" sub="Each public slot, its current creative and live status">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {AD_SLOTS.map(([slot, dim, sponsor, sched, imp, on]) => (
              <div key={slot} className="row" style={{ gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 12, background: on ? "var(--surface)" : "var(--surface-2)" }}>
                <span style={{ width: 52, height: 38, borderRadius: 7, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }}><Icon d={IC.image} size={18} /></span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{slot}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{dim} · {sponsor}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sched}</span>
                  <span className="t-num" style={{ fontSize: 11.5, fontWeight: 700 }}>{imp !== "—" ? imp + " views" : "—"}</span>
                </span>
                <Toggle on={on} />
                <IconBtn d={IC.edit} primary />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Load new ad" sub="Pulls dimensions from the slot and sponsors from your list">
          <Field label="Placement" req hint="Required size auto-fills below">
            <SelectIn value="Home · Leaderboard banner (728×90)" />
          </Field>
          <Field label="Sponsor" req><SelectIn value="Apex Telecom — Title sponsor" /></Field>
          <Field label="Creative" req>
            <UploadField tall hint={<span>728×90 JPG/PNG/GIF, ≤200KB. <span style={{ color: "var(--primary)", fontWeight: 600 }}>Upload</span></span>}>
              <span style={{ width: 70, height: 38, borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flex: "none" }}><Icon d={IC.image} size={18} /></span>
            </UploadField>
          </Field>
          <Field label="Click-through URL" req><TextIn value="https://apextel.lk/fiesta" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Start date" req><TextIn value="2026-06-01" mono /></Field>
            <Field label="End date" req><TextIn value="2026-06-30" mono /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "end" }}>
            <Field label="Rotation weight" hint="Higher = shown more often"><NumIn value="5" /></Field>
            <Field label=""><ToggleRow label="Activate now" sub="Go live on start date" on /></Field>
          </div>
          <FormActions saveLabel="Load ad" />
        </Panel>
      </div>

      <Panel title="Sponsors" sub="Tier drives where logos appear (footer, hero, presented-by tags)"
        actions={<span className="btn btn-soft btn-sm"><Icon d={IC.plus} size={14} /> Add sponsor</span>}>
        <table className="stat">
          <thead><tr><th>Sponsor</th><th>Tier</th><th>Website</th><th>Status</th><th className="num">Actions</th></tr></thead>
          <tbody>
            {SPONSORS.map(([n, tier, url, st]) => (
              <tr key={n}>
                <td><span className="row" style={{ gap: 10 }}><span style={{ width: 30, height: 30, borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}><Icon d={IC.image} size={15} /></span><span style={{ fontWeight: 600 }}>{n}</span></span></td>
                <td><span className="badge badge-upcoming">{tier}</span></td>
                <td><span className="row" style={{ gap: 6, fontSize: 12, color: "var(--primary)" }}><Icon d={IC.link} size={13} />{url}</span></td>
                <td><StatusPill s={st} /></td>
                <td><RowActions /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </AdminShell>
  );
}

function PopularVotesScreen() {
  const rows = [
    [1, "K. Perera", "CST", 342, "bat"], [2, "M. Fernando", "SES", 318, "ball"], [3, "D. Bandara", "AIB", 296, "bat"],
    [4, "S. Rathnayake", "DSD", 241, "bat"], [5, "A. Wickramasinghe", "ISW", 212, "field"], [6, "P. Gunawardena", "NSC", 187, "ball"],
  ];
  return (
    <AdminShell active="Popular Votes" title="Popular Votes">
      <PageHead title="Popular vote" sub="Adjust counts, open or close voting, and configure the rules"
        actions={<><span className="btn btn-ghost btn-sm"><Icon d={IC.download} size={14} /> Export</span><span className="btn btn-danger btn-sm">Reset all votes</span></>} />
      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 16, alignItems: "start" }}>
        <TableWrap>
          <thead><tr><th className="num">#</th><th>Player</th><th>Team</th><th className="num">Votes</th><th className="num" style={{ width: 150 }}>Adjust</th><th className="num">Edit</th></tr></thead>
          <tbody>
            {rows.map(([r, n, t, v, rt]) => (
              <tr key={r}>
                <td className="t-num" style={{ fontWeight: 700, color: r <= 3 ? "var(--highlight)" : "var(--text-muted)" }}>{r}</td>
                <td><span className="row" style={{ gap: 9 }}><RoleAvatar name={n} size={26} color={TEAMS[t].color} role={rt} /><span style={{ fontWeight: 600 }}>{n}</span></span></td>
                <td><span className="row" style={{ gap: 6, fontSize: 12, color: "var(--text-muted)" }}><TeamLogo t={t} size="sm" />{TEAMS[t].name}</span></td>
                <td className="num t-num" style={{ fontWeight: 700, fontSize: 15 }}>{v}</td>
                <td><span className="row" style={{ gap: 6, justifyContent: "flex-end" }}><IconBtn d={IC.minus} /><IconBtn d={IC.plus} primary /></span></td>
                <td><RowActions onlyEdit /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Panel title="Voting rules">
          <ToggleRow label="Voting open" sub="Public can cast votes right now" on />
          <ToggleRow label="One vote per device" sub="Throttle by browser fingerprint" on />
          <ToggleRow label="Show live counts publicly" sub="Hide to reveal only at the ceremony" />
          <div className="divider"></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Opens"><TextIn value="2026-06-01" mono /></Field>
            <Field label="Closes"><TextIn value="2026-06-20" mono /></Field>
          </div>
          <Field label="Eligible players"><SelectIn value="All active players" /></Field>
          <FormActions saveLabel="Save rules" />
        </Panel>
      </div>
    </AdminShell>
  );
}

function LeaderboardRebuildScreen() {
  return (
    <AdminShell active="Leaderboard" title="Leaderboard">
      <PageHead title="Leaderboard & stats" sub="Recompute every batting, bowling and points table from scored deliveries" />
      <div style={{ display: "grid", gridTemplateColumns: "5fr 7fr", gap: 16, alignItems: "start" }}>
        <Panel title="Rebuild engine">
          <div className="row" style={{ gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: "50%", background: "color-mix(in oklab, var(--success) 14%, transparent)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon d={IC.check2} size={22} /></span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>Up to date</span>
              <span className="t-small" style={{ color: "var(--text-muted)" }}>Last rebuilt 12 min ago · 3,182 balls processed</span>
            </span>
          </div>
          <span className="btn btn-primary btn-lg" style={{ justifyContent: "center" }}><Icon d={IC.refresh} size={16} /> Rebuild now</span>
          <span className="t-small" style={{ color: "var(--text-muted)" }}>Runs automatically after every completed match. Manual rebuild is safe and non-destructive.</span>
        </Panel>
        <Panel title="What gets recomputed">
          {[["Batting table", "Runs, balls, SR, average, 4s/6s, HS", "current"], ["Bowling table", "Overs, runs, wickets, economy, best figures", "current"], ["Overall points", "Bat + bowl + field points, NRR tiebreak", "current"], ["Team standings", "Played, won, lost, points, net run rate", "current"], ["Popularity rank", "Sorted from current vote counts", "current"]].map(([t, d, s]) => (
            <div key={t} className="row" style={{ gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--success)" }}><Icon d={IC.check2} size={16} /></span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t}</span>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{d}</span>
              </span>
              <span className="badge badge-completed" style={{ marginLeft: "auto" }}>In sync</span>
            </div>
          ))}
          <span className="t-small" style={{ color: "var(--text-muted)" }}>Recent: rebuild #214 · triggered by Match 13 completion · 0 anomalies</span>
        </Panel>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { SponsorsAdsScreen, PopularVotesScreen, LeaderboardRebuildScreen });
