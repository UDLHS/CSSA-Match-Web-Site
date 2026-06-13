"use client";

import { useMemo, useState } from "react";
import { RoleAvatar, TeamLogo } from "./atoms";
import { ChevR, Icon, IC, type ActivityRole } from "./icons";
import { PlayerModal, type PlayerModalInitial } from "./player-modal";

export interface SquadPlayer {
  playerId: string;
  name: string;
  photoUrl: string | null;
  role: string;
  roleLabel: string;
  styleLine: string;
  isCaptain: boolean;
  keyStat: { label: string; value: string | number };
}

export interface TeamSquad {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  primaryColor: string;
  coach: string | null;
  homeVenue: string | null;
  players: SquadPlayer[];
}

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

/**
 * Public squads — players grouped under their team like a real match sheet.
 * Captain leads each squad. Cards open the player modal.
 */
export function SquadsView({ teams }: { teams: TeamSquad[] }) {
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("all");
  const [open, setOpen] = useState<{ id: string; initial: PlayerModalInitial } | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams
      .filter((t) => teamId === "all" || t.id === teamId)
      .map((t) => ({
        ...t,
        players: q ? t.players.filter((p) => p.name.toLowerCase().includes(q)) : t.players,
      }))
      .filter((t) => t.players.length > 0 || (!q && teamId !== "all"));
  }, [teams, search, teamId]);

  const totalShown = visible.reduce((n, t) => n + t.players.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Toolbar */}
      <div className="max-md:flex max-md:flex-col md:flex md:flex-row md:items-center" style={{ gap: 10 }}>
        <span className="input" style={{ width: "100%", maxWidth: 260 }}>
          <span style={{ color: "var(--muted)" }}><Icon d={IC.search} size={15} /></span>
          <input type="search" placeholder="Search player…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search player" />
        </span>
        <span className="input" style={{ width: "100%", maxWidth: 200 }}>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Jump to team">
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevR />
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
          {visible.length} team{visible.length === 1 ? "" : "s"} · {totalShown} player{totalShown === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <Icon d={IC.user} size={20} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>No players match your search</span>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => { setSearch(""); setTeamId("all"); }}>Clear</button>
        </div>
      ) : (
        visible.map((team) => (
          <section key={team.id} className="card" style={{ padding: "clamp(14px, 2vw, 20px)", display: "flex", flexDirection: "column", gap: 14 }} aria-label={`${team.name} squad`}>
            {/* Team header */}
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <TeamLogo team={team} size="lg" />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className="t-h2" style={{ lineHeight: 1.05 }}>{team.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {team.players.length} player{team.players.length === 1 ? "" : "s"}
                  {team.coach ? ` · Coach ${team.coach}` : ""}
                  {team.homeVenue ? ` · ${team.homeVenue}` : ""}
                </span>
              </span>
            </div>
            <div className="divider" />

            {/* Squad */}
            {team.players.length === 0 ? (
              <span className="t-small" style={{ color: "var(--muted)" }}>No players announced yet.</span>
            ) : (
              <div className="grid max-md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 10 }}>
                {team.players.map((p) => (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => setOpen({
                      id: p.playerId,
                      initial: {
                        name: p.name,
                        photoUrl: p.photoUrl,
                        role: p.role,
                        roleLabel: p.roleLabel,
                        team: { id: team.id, name: team.name, shortName: team.shortName, logoUrl: team.logoUrl, primaryColor: team.primaryColor },
                        isCaptain: p.isCaptain,
                      },
                    })}
                    className="row"
                    style={{
                      gap: 11,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: p.isCaptain ? "var(--primary-soft)" : "var(--surface)",
                      borderColor: p.isCaptain ? "color-mix(in oklab, var(--primary) 30%, var(--border))" : "var(--border)",
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                      textAlign: "left",
                      width: "100%",
                    }}
                    aria-label={`Open profile: ${p.name}`}
                  >
                    <RoleAvatar name={p.name} size={42} color={team.primaryColor} role={roleGlyph(p.role)} photoUrl={p.photoUrl} />
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 2 }}>
                      <span className="row" style={{ gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        {p.isCaptain && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--primary)", border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)", borderRadius: 5, padding: "0 5px", lineHeight: "15px", flex: "none" }}>
                            CAPTAIN
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.roleLabel}{p.styleLine ? ` · ${p.styleLine}` : ""}
                      </span>
                    </span>
                    <span className="t-num" style={{ fontWeight: 800, fontSize: 16, flex: "none", textAlign: "right" }}>
                      {p.keyStat.value}
                      <span style={{ fontSize: 9, fontWeight: 600, color: "var(--muted)", marginLeft: 3 }}>{p.keyStat.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))
      )}

      {open && <PlayerModal playerId={open.id} initial={open.initial} onClose={() => setOpen(null)} />}
    </div>
  );
}
