"use client";

import { useState } from "react";
import { Icon, IC } from "@/components/public/icons";
import type { ConsoleInnings, ConsolePlayerOption } from "@/lib/scoring-console-types";

export interface WicketSubmit {
  type: string;
  dismissedPlayerId: string;
  bowlerCredited: boolean;
  fielderId: string | null;
  directHit: boolean;
  battersCrossed: boolean;
  runsOffBat: number;
  newBatterId: string | null;
  notes: string | null;
}

const TYPES: { value: string; label: string; bowlerCredited: boolean; striker: boolean }[] = [
  { value: "BOWLED", label: "Bowled", bowlerCredited: true, striker: true },
  { value: "CAUGHT", label: "Caught", bowlerCredited: true, striker: true },
  { value: "LBW", label: "LBW", bowlerCredited: true, striker: true },
  { value: "RUN_OUT", label: "Run out", bowlerCredited: false, striker: false },
  { value: "STUMPED", label: "Stumped", bowlerCredited: true, striker: true },
  { value: "HIT_WICKET", label: "Hit wicket", bowlerCredited: true, striker: true },
  { value: "CAUGHT_AND_BOWLED", label: "Caught & bowled", bowlerCredited: true, striker: true },
  { value: "OBSTRUCTING_FIELD", label: "Obstructing", bowlerCredited: false, striker: false },
];

/** Free hit: only run-out / obstructing / hit-ball-twice may dismiss. */
const FREE_HIT_TYPES = new Set(["RUN_OUT", "OBSTRUCTING_FIELD"]);

export function WicketDialog({
  innings,
  freeHit,
  fielders,
  allOutNext,
  busy,
  onConfirm,
  onCancel,
}: {
  innings: ConsoleInnings;
  freeHit: boolean;
  fielders: ConsolePlayerOption[];
  allOutNext: boolean;
  busy: boolean;
  onConfirm: (w: WicketSubmit) => void;
  onCancel: () => void;
}) {
  const types = freeHit ? TYPES.filter((t) => FREE_HIT_TYPES.has(t.value)) : TYPES;
  const [type, setType] = useState(types[0].value);
  const selected = TYPES.find((t) => t.value === type)!;

  const strikerId = innings.striker?.playerId ?? "";
  const [dismissedId, setDismissedId] = useState(strikerId);
  const [bowlerCredited, setBowlerCredited] = useState(selected.bowlerCredited);
  const [fielderId, setFielderId] = useState("");
  const [directHit, setDirectHit] = useState(false);
  const [crossed, setCrossed] = useState(false);
  const [runs, setRuns] = useState(0);
  const [newBatterId, setNewBatterId] = useState(innings.availableBatters[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const isRunOut = type === "RUN_OUT" || type === "OBSTRUCTING_FIELD";

  const pickType = (value: string) => {
    setType(value);
    const t = TYPES.find((x) => x.value === value)!;
    setBowlerCredited(t.bowlerCredited);
    // Non-striker can only go on run-out/obstructing; otherwise force striker.
    if (t.striker) setDismissedId(strikerId);
  };

  const submit = () => {
    onConfirm({
      type,
      dismissedPlayerId: dismissedId,
      bowlerCredited,
      fielderId: fielderId || null,
      directHit,
      battersCrossed: isRunOut ? crossed : false,
      runsOffBat: isRunOut ? runs : 0,
      newBatterId: allOutNext ? null : newBatterId || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Record wicket"
        onClick={(e) => e.stopPropagation()}
        className="card md:!self-center"
        style={{ width: 440, maxWidth: "100%", maxHeight: "92dvh", overflowY: "auto", borderRadius: 16, padding: 0, boxShadow: "var(--shadow-pop)" }}
      >
        <div className="row" style={{ justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span className="t-h3" style={{ color: "var(--danger)" }}>Wicket — {innings.oversDisplay}</span>
          <button type="button" onClick={onCancel} aria-label="Cancel" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
            <Icon d={IC.x} size={16} />
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span className="field-label">Dismissal type</span>
            <div className="grid grid-cols-3" style={{ gap: 7 }}>
              {types.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => pickType(t.value)}
                  style={{
                    padding: "9px 4px",
                    borderRadius: 9,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: type === t.value ? "1.5px solid var(--danger)" : "1px solid var(--border)",
                    background: type === t.value ? "color-mix(in oklab, var(--danger) 9%, transparent)" : "var(--surface)",
                    color: type === t.value ? "var(--danger)" : "var(--text)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="field-label">Player out</span>
            <span className="input">
              <select value={dismissedId} onChange={(e) => setDismissedId(e.target.value)} disabled={selected.striker}>
                {innings.atCrease.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.id === strikerId ? " (striker)" : " (non-striker)"}
                  </option>
                ))}
              </select>
            </span>
          </div>

          {isRunOut && (
            <div className="grid grid-cols-2" style={{ gap: 12 }}>
              <div>
                <span className="field-label">Runs completed</span>
                <span className="input">
                  <select value={runs} onChange={(e) => setRuns(Number(e.target.value))}>
                    {[0, 1, 2, 3].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </span>
              </div>
              <label className="row" style={{ gap: 8, paddingTop: 22, cursor: "pointer" }}>
                <input type="checkbox" checked={crossed} onChange={(e) => setCrossed(e.target.checked)} />
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Batters crossed</span>
              </label>
            </div>
          )}

          {selected.bowlerCredited !== false && !isRunOut && (
            <label className="row" style={{ gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={bowlerCredited} onChange={(e) => setBowlerCredited(e.target.checked)} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Bowler credited with the wicket</span>
            </label>
          )}

          {(type === "CAUGHT" || type === "STUMPED" || isRunOut) && (
            <div>
              <span className="field-label">{type === "STUMPED" ? "Keeper" : type === "CAUGHT" ? "Catcher" : "Fielder"}</span>
              <span className="input">
                <select value={fielderId} onChange={(e) => setFielderId(e.target.value)}>
                  <option value="">— none —</option>
                  {fielders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </span>
              {isRunOut && (
                <label className="row" style={{ gap: 8, marginTop: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={directHit} onChange={(e) => setDirectHit(e.target.checked)} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Direct hit</span>
                </label>
              )}
            </div>
          )}

          {!allOutNext ? (
            <div>
              <span className="field-label">New batter</span>
              <span className="input">
                <select value={newBatterId} onChange={(e) => setNewBatterId(e.target.value)}>
                  {innings.availableBatters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600 }}>
              This is the final wicket — the innings ends (all out).
            </span>
          )}

          <div>
            <span className="field-label">Notes</span>
            <span className="input">
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional — e.g. edge to keeper" />
            </span>
          </div>
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger btn-lg" disabled={busy} onClick={submit} style={{ opacity: busy ? 0.7 : 1 }}>
            {busy ? "Recording…" : "Confirm wicket"}
          </button>
        </div>
      </div>
    </div>
  );
}
