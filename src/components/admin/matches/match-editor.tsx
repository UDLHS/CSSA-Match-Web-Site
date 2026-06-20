"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToss, setPlayingXI, updateMatch, softDeleteMatch } from "@/server/actions/matches";
import { publishMatch, abandonMatch } from "@/server/actions/match-lifecycle";
import { PageHead, Panel, Field, StatusPill } from "@/components/admin/kit";
import { RoleAvatar } from "@/components/public/atoms";
import { Icon, IC, type ActivityRole } from "@/components/public/icons";

interface TeamLite { id: string; name: string; shortName: string }
interface SquadMember { id: string; name: string; role: string; jersey: number | null }

function roleGlyph(role: string): ActivityRole {
  if (role === "BOWLER") return "ball";
  if (role === "WICKET_KEEPER") return "field";
  return "bat";
}

export function MatchEditor({
  match,
  home,
  away,
  homeSquad,
  awaySquad,
  venues,
  existingXI,
}: {
  match: {
    id: string;
    matchNumber: number;
    status: string;
    format: string;
    oversPerSide: number;
    playersPerSide: number;
    scheduledAt: string;
    venueId: string | null;
    stage: string | null;
    tossWonByTeamId: string | null;
    tossDecision: string | null;
    umpire1: string | null;
    umpire2: string | null;
  };
  home: TeamLite | null;
  away: TeamLite | null;
  homeSquad: SquadMember[];
  awaySquad: SquadMember[];
  venues: { id: string; name: string; location: string }[];
  existingXI: { teamId: string; playerId: string; battingOrder: number; isKeeper: boolean }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editable = match.status === "DRAFT" || match.status === "UPCOMING";
  const canAbandon = match.status !== "COMPLETED" && match.status !== "ABANDONED";
  const canDelete = match.status !== "LIVE" && match.status !== "INNINGS_BREAK";

  const act = async (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, ok?: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(res.error!.message);
    else {
      if (ok) setNotice(ok);
      router.refresh();
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete match ${match.matchNumber} (${home?.shortName ?? "?"} vs ${away?.shortName ?? "?"})? This removes only this match — both teams and their other matches are unaffected.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await softDeleteMatch(match.id);
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    router.push("/admin/matches");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHead
        title={`Match ${match.matchNumber} — ${home?.shortName ?? "?"} vs ${away?.shortName ?? "?"}`}
        sub="Toss, playing XI and lifecycle are managed here"
        actions={
          <span className="row" style={{ gap: 8 }}>
            <StatusPill status={match.status} />
            {match.status === "DRAFT" && (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(() => publishMatch(match.id), "Match published")}>
                Publish
              </button>
            )}
            {(match.status === "LIVE" || match.status === "INNINGS_BREAK" || match.status === "UPCOMING") && (
              <Link href={`/admin/scoring/${match.id}`} className="btn btn-soft btn-sm" style={{ textDecoration: "none" }}>
                <Icon d={IC.bolt} size={14} /> Scoring
              </Link>
            )}
          </span>
        }
      />

      {error && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}>
          <Icon d={IC.alert} size={14} /> {error}
        </div>
      )}
      {notice && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--success)", background: "color-mix(in oklab, var(--success) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}>
          <Icon d={IC.check2} size={14} /> {notice}
        </div>
      )}

      <DetailsPanel match={match} venues={venues} editable={editable} busy={busy} onSave={act} />

      {home && away && (
        <TossPanel match={match} home={home} away={away} editable={editable} busy={busy} onSave={act} />
      )}

      <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
        {home && <XIPanel team={home} squad={homeSquad} required={match.playersPerSide} existing={existingXI.filter((x) => x.teamId === home.id)} matchId={match.id} editable={editable} busy={busy} onSave={act} />}
        {away && <XIPanel team={away} squad={awaySquad} required={match.playersPerSide} existing={existingXI.filter((x) => x.teamId === away.id)} matchId={match.id} editable={editable} busy={busy} onSave={act} />}
      </div>

      {canDelete && (
        <Panel title="Danger zone" pad={16} style={{ borderColor: "color-mix(in oklab, var(--danger) 35%, var(--border))" }}>
          {editable && (
          <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>Abandon match</span>
              <span className="t-small" style={{ color: "var(--muted)" }}>Marks the match abandoned; it stays in records.</span>
            </span>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => { if (confirm("Abandon this match?")) act(() => abandonMatch({ matchId: match.id, reason: "Abandoned by admin" }), "Match abandoned"); }}>
              <Icon d={IC.trash} size={14} /> Abandon…
            </button>
          </div>
          )}
          <div className="row" style={{ justifyContent: "space-between", gap: 12, marginTop: editable ? 14 : 0, paddingTop: editable ? 14 : 0, borderTop: editable ? "1px solid var(--border)" : "none" }}>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>Delete match</span>
              <span className="t-small" style={{ color: "var(--muted)" }}>Removes only this fixture — both teams and their other matches are unaffected.</span>
            </span>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}>
              <Icon d={IC.trash} size={14} /> Delete…
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function DetailsPanel({ match, venues, editable, busy, onSave }: {
  match: { id: string; scheduledAt: string; venueId: string | null; stage: string | null; oversPerSide: number; umpire1: string | null; umpire2: string | null };
  venues: { id: string; name: string; location: string }[];
  editable: boolean;
  busy: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, ok?: string) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(match.scheduledAt.slice(0, 16));
  const [venueId, setVenueId] = useState(match.venueId ?? "");
  const [stage, setStage] = useState(match.stage ?? "");
  const [u1, setU1] = useState(match.umpire1 ?? "");
  const [u2, setU2] = useState(match.umpire2 ?? "");

  return (
    <Panel title="Schedule, venue & officials" actions={
      editable ? (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onSave(() => updateMatch({ id: match.id, scheduledAt: new Date(scheduledAt), venueId: venueId || null, stage: stage || null, umpire1: u1 || null, umpire2: u2 || null }), "Details saved")}>
          <Icon d={IC.check2} size={14} /> Save
        </button>
      ) : undefined
    }>
      <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
        <Field label="Date & time"><span className="input"><input type="datetime-local" disabled={!editable} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></span></Field>
        <Field label="Venue"><span className="input"><select disabled={!editable} value={venueId} onChange={(e) => setVenueId(e.target.value)}><option value="">— none —</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}, {v.location}</option>)}</select></span></Field>
        <Field label="Stage / round"><span className="input"><input type="text" disabled={!editable} value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Group stage" /></span></Field>
        <Field label="Umpires">
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            <span className="input"><input type="text" disabled={!editable} value={u1} onChange={(e) => setU1(e.target.value)} placeholder="Umpire 1" /></span>
            <span className="input"><input type="text" disabled={!editable} value={u2} onChange={(e) => setU2(e.target.value)} placeholder="Umpire 2" /></span>
          </div>
        </Field>
      </div>
      {!editable && <span className="t-small" style={{ color: "var(--muted)" }}>Locked — the match has started.</span>}
    </Panel>
  );
}

function TossPanel({ match, home, away, editable, busy, onSave }: {
  match: { id: string; tossWonByTeamId: string | null; tossDecision: string | null };
  home: TeamLite;
  away: TeamLite;
  editable: boolean;
  busy: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, ok?: string) => void;
}) {
  const [winner, setWinner] = useState(match.tossWonByTeamId ?? "");
  const [decision, setDecision] = useState(match.tossDecision ?? "BAT");

  return (
    <Panel title="Toss" actions={
      editable ? (
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !winner} onClick={() => onSave(() => setToss({ matchId: match.id, tossWonByTeamId: winner, decision }), "Toss saved")}>
          <Icon d={IC.check2} size={14} /> Save toss
        </button>
      ) : undefined
    }>
      <div className="grid max-md:grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
        <Field label="Toss winner"><span className="input"><select disabled={!editable} value={winner} onChange={(e) => setWinner(e.target.value)}><option value="">— set after toss —</option><option value={home.id}>{home.name}</option><option value={away.id}>{away.name}</option></select></span></Field>
        <Field label="Elected to">
          <div className="row" style={{ gap: 8 }}>
            {(["BAT", "BOWL"] as const).map((d) => (
              <button key={d} type="button" disabled={!editable} onClick={() => setDecision(d)} className="btn btn-sm" style={{ flex: 1, background: decision === d ? "var(--primary-soft)" : "var(--surface)", color: decision === d ? "var(--primary)" : "var(--text)", border: decision === d ? "1.5px solid var(--primary)" : "1px solid var(--border)" }}>
                {d === "BAT" ? "Bat" : "Bowl"}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Panel>
  );
}

function XIPanel({ team, squad, required, existing, matchId, editable, busy, onSave }: {
  team: TeamLite;
  squad: SquadMember[];
  required: number;
  existing: { playerId: string; battingOrder: number; isKeeper: boolean }[];
  matchId: string;
  editable: boolean;
  busy: boolean;
  onSave: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>, ok?: string) => void;
}) {
  // Selected players in batting order; keeper marked separately.
  const initial = existing
    .sort((a, b) => a.battingOrder - b.battingOrder)
    .map((x) => x.playerId);
  const [picked, setPicked] = useState<string[]>(initial);
  const [keeperId, setKeeperId] = useState<string>(existing.find((x) => x.isKeeper)?.playerId ?? "");

  const toggle = (id: string) => {
    if (!editable) return;
    setPicked((p) => {
      if (p.includes(id)) {
        if (keeperId === id) setKeeperId("");
        return p.filter((x) => x !== id);
      }
      if (p.length >= required) return p;
      return [...p, id];
    });
  };

  const save = () =>
    onSave(
      () =>
        setPlayingXI({
          matchId,
          teamId: team.id,
          players: picked.map((playerId, i) => ({
            playerId,
            battingOrder: i + 1,
            isKeeper: playerId === keeperId,
          })),
        }),
      `${team.shortName} XI saved`,
    );

  return (
    <Panel
      title={`${team.name} — Playing XI`}
      sub={`Tick ${required} · drives the scoring dropdowns`}
      actions={
        editable ? (
          <span className="row" style={{ gap: 8 }}>
            <span className="badge badge-upcoming">{picked.length}/{required}</span>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || picked.length !== required} onClick={save}>
              <Icon d={IC.check2} size={14} /> Save
            </button>
          </span>
        ) : <span className="badge badge-upcoming">{picked.length}/{required}</span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {squad.length === 0 && <span className="t-small" style={{ color: "var(--muted)" }}>No squad players — add players to this team first.</span>}
        {squad.map((p) => {
          const on = picked.includes(p.id);
          const order = picked.indexOf(p.id) + 1;
          return (
            <div key={p.id} className="row" style={{ gap: 10, padding: "7px 10px", borderRadius: 9, border: "1px solid " + (on ? "color-mix(in oklab, var(--primary) 35%, transparent)" : "var(--border)"), background: on ? "var(--primary-soft)" : "var(--surface)" }}>
              <button type="button" onClick={() => toggle(p.id)} disabled={!editable} aria-pressed={on} style={{ width: 18, height: 18, borderRadius: 5, flex: "none", border: on ? "none" : "1.5px solid var(--border)", background: on ? "var(--primary)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: editable ? "pointer" : "default" }}>
                {on ? <Icon d={IC.check2} size={12} /> : null}
              </button>
              <RoleAvatar name={p.name} size={26} color={undefined} role={roleGlyph(p.role)} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</span>
              {on && <span className="t-num" style={{ fontSize: 11, color: "var(--primary)" }}>#{order}</span>}
              <span className="row" style={{ gap: 8, marginLeft: "auto" }}>
                {on && (
                  <button type="button" onClick={() => editable && setKeeperId(keeperId === p.id ? "" : p.id)} disabled={!editable} className="badge" style={{ cursor: editable ? "pointer" : "default", background: keeperId === p.id ? "var(--primary)" : "var(--surface-2)", color: keeperId === p.id ? "#fff" : "var(--muted)" }}>
                    WK
                  </button>
                )}
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.jersey != null ? `#${p.jersey}` : ""}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
