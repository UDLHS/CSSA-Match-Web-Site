import Link from "next/link";
import { getDashboardData } from "@/server/queries/admin";
import { StatusBadge, BallStrip } from "@/components/public/atoms";
import { Icon, IC } from "@/components/public/icons";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard — Fiesta Admin" };

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_LABEL: Record<string, string> = {
  "delivery.create": "Logged ball",
  "delivery.undo": "Undid ball",
  "delivery.edit": "Edited ball",
  "innings.start": "Started innings",
  "innings.end": "Ended innings",
  "match.start": "Started match",
  "match.complete": "Completed match",
  "match.create": "Created match",
  "match.publish": "Published match",
  "votes.adjust": "Adjusted votes",
  "leaderboard.rebuild": "Rebuilt leaderboard",
  "team.create": "Created team",
  "team.update": "Updated team",
  "player.create": "Created player",
  "player.update": "Updated player",
};

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  const statCards = [
    { label: "Matches", value: data.stats.matches, sub: `${data.stats.liveToday} live now` },
    { label: "Teams", value: data.stats.teams, sub: "registered" },
    { label: "Players", value: data.stats.players, sub: "registered" },
    { label: "Balls logged", value: data.stats.ballsLogged.toLocaleString(), sub: "across all matches" },
  ];

  return (
    <>
      <div className="grid max-md:grid-cols-2 md:grid-cols-4" style={{ gap: 14 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: "16px 18px" }}>
            <span className="t-label">{s.label}</span>
            <div className="t-num" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, lineHeight: 1.15 }}>
              {s.value}
            </div>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {data.liveCards.map((m) => (
        <div key={m.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, borderColor: "var(--live)" }}>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <span className="row" style={{ gap: 10 }}>
              <StatusBadge status="LIVE" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Match {m.matchNumber} — {m.title}</span>
            </span>
            <Link href={`/admin/scoring/${m.id}`} className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              <Icon d={IC.bolt} size={14} /> Open scoring console
            </Link>
          </div>
          <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
            <span className="t-score-md t-num">
              {m.score} <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>({m.overs})</span>
            </span>
            {m.needLine && (
              <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: "auto" }}>
                Target {m.target} · {m.needLine}
              </span>
            )}
          </div>
        </div>
      ))}

      <div className="grid max-md:grid-cols-1 md:grid-cols-[7fr_5fr]" style={{ gap: 14 }}>
        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="t-h3" style={{ marginBottom: 6 }}>Today&#39;s fixtures</span>
          {data.todaysFixtures.length === 0 ? (
            <span style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>No fixtures scheduled today.</span>
          ) : (
            data.todaysFixtures.map((f) => (
              <div key={f.id} className="row" style={{ gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11.5, color: "var(--muted)", width: 60, flex: "none" }}>Match {f.matchNumber}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{f.teams}</span>
                <span style={{ marginLeft: "auto" }}>
                  {f.status === "LIVE" || f.status === "INNINGS_BREAK" ? (
                    <StatusBadge status="LIVE" />
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {fmtTime(f.time)}{f.venue ? ` · ${f.venue}` : ""}
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="t-h3" style={{ marginBottom: 6 }}>Recent activity</span>
          {data.recentAudit.length === 0 ? (
            <span style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>No activity yet.</span>
          ) : (
            data.recentAudit.map((a) => (
              <div key={a.id} className="row" style={{ gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                <span style={{ fontWeight: 600 }}>{ACTION_LABEL[a.action] ?? a.action}</span>
                <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.details ?? a.entityType}
                </span>
                <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 11.5, flex: "none" }}>
                  {a.who} · {relativeTime(a.at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
