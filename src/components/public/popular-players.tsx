import type { PopularRow } from "@/lib/leaderboard-types";
import { shortName } from "@/lib/format";
import { RoleAvatar, TeamLogo } from "./atoms";
import type { ActivityRole } from "./icons";

const ROLE_LABEL: Record<string, string> = {
  BATTER: "Batter",
  BOWLER: "Bowler",
  ALL_ROUNDER: "All-rounder",
  WICKET_KEEPER: "Keeper",
};

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

export function PopularCard({
  row,
  big,
}: {
  row: PopularRow;
  big?: boolean;
}) {
  const rankBg =
    row.rank === 1
      ? "var(--highlight)"
      : row.rank === 2
        ? "color-mix(in oklab, var(--muted) 62%, white)"
        : "color-mix(in oklab, var(--warn) 62%, var(--muted))";
  return (
    <div
      className="card"
      style={{
        padding: big ? 18 : 14,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        position: "relative",
        borderColor: row.rank === 1 ? "var(--highlight)" : "var(--border)",
      }}
    >
      <span
        className="t-num"
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: row.rank <= 3 ? rankBg : "var(--surface-2)",
          color: row.rank <= 3 ? "var(--ink)" : "var(--muted)",
          fontWeight: 800,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {row.rank}
      </span>
      <RoleAvatar
        name={row.name}
        size={big ? 64 : 48}
        color={row.team?.primaryColor}
        role={roleGlyph(row.role)}
        photoUrl={row.photoUrl}
      />
      <span style={{ fontSize: big ? 15 : 13.5, fontWeight: 700, textAlign: "center" }}>
        {shortName(row.name)}
      </span>
      {row.team && (
        <span className="row" style={{ gap: 5, fontSize: 11, color: "var(--muted)" }}>
          <TeamLogo team={row.team} size="sm" />
          {row.team.name}
        </span>
      )}
      <span className="badge badge-upcoming" style={{ fontSize: 10 }}>
        {ROLE_LABEL[row.role] ?? row.role}
      </span>
      <span className="t-num" style={{ fontWeight: 800, fontSize: big ? 22 : 17 }}>
        {row.votes}
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", marginLeft: 4 }}>VOTES</span>
      </span>
    </div>
  );
}

/** Popular players section — admin-set votes only (boards/home.jsx). */
export function PopularPlayers({ rows }: { rows: PopularRow[] }) {
  if (rows.length === 0) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-label="Popular players">
        <h2 className="t-h2">Popular players</h2>
        <div className="card" style={{ padding: 20, textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            The popularity ranking opens soon.
          </span>
        </div>
      </section>
    );
  }
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3, 7);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-label="Popular players">
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 className="t-h2">Popular players</h2>
        <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
          ★ Official popularity ranking
        </span>
      </div>
      <div className="grid max-md:grid-cols-2 md:grid-cols-3" style={{ gap: 14 }}>
        {podium.map((r, i) => (
          <div key={r.playerId} className={i === 0 ? "max-md:col-span-2" : ""}>
            <PopularCard row={r} big />
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="grid max-md:grid-cols-2 md:grid-cols-4" style={{ gap: 14 }}>
          {rest.map((r) => (
            <PopularCard key={r.playerId} row={r} />
          ))}
        </div>
      )}
    </section>
  );
}
