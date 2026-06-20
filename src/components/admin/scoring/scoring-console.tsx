"use client";

import { useEffect, useState } from "react";
import type { ScoringStateDTO, ConsoleInnings } from "@/lib/scoring-console-types";
import { RoleAvatar, StatusBadge } from "@/components/public/atoms";
import { Ball, TeamLogo } from "@/components/public/atoms";
import { Icon, IC } from "@/components/public/icons";
import {
  consoleRecordDelivery,
  consoleRecordRetirement,
  consoleSwapStrike,
  consoleUndo,
  consoleStartInnings,
  consoleEndInnings,
  consoleCompleteMatch,
  consoleAbandonMatch,
} from "@/server/actions/scoring-console";
import type { ActionResult } from "@/server/result";
import { ScorePad } from "./score-pad";
import { WicketDialog, type WicketSubmit } from "./wicket-dialog";

const key = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ScoringConsole({ initial }: { initial: ScoringStateDTO }) {
  const [state, setState] = useState(initial);
  const [bowlerId, setBowlerId] = useState<string | null>(
    initial.innings?.currentBowlerId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [byePrompt, setByePrompt] = useState<"BYE" | "LEG_BYE" | null>(null);
  const [widePrompt, setWidePrompt] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const innings = state.innings;

  // Keep the selected bowler in sync: clear it at the start of a fresh over.
  useEffect(() => {
    if (!innings) return;
    if (innings.atOverStart) setBowlerId((b) => b ?? null);
    else setBowlerId(innings.currentBowlerId);
  }, [innings?.nextSequence, innings?.atOverStart, innings?.currentBowlerId]);

  const applyState = (next: ScoringStateDTO) => {
    setState(next);
    const inn = next.innings;
    setBowlerId(inn && !inn.atOverStart ? inn.currentBowlerId : null);
  };

  /**
   * Wrap a console mutation: guard double-fire, surface errors, and apply the
   * fresh state the wrapper returns — ONE server round-trip per tap.
   */
  const run = async (fn: () => Promise<ActionResult<ScoringStateDTO>>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      if (!res.ok) setError(res.error.message);
      else applyState(res.data);
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  const needsBowler = !!innings && innings.atOverStart && !bowlerId;

  const mid = state.matchId;

  const recordRuns = (runs: number) => {
    if (!innings || !bowlerId) return;
    void run(() =>
      consoleRecordDelivery(mid, {
        inningsId: innings.id,
        idempotencyKey: key(),
        expectedSequence: innings.nextSequence,
        bowlerId,
        runsOffBat: runs,
      }),
    );
  };

  const recordExtra = (type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE") => {
    if (!innings || !bowlerId) return;
    if (type === "BYE" || type === "LEG_BYE") {
      setByePrompt(type);
      return;
    }
    if (type === "WIDE") {
      setWidePrompt(true);
      return;
    }
    void run(() =>
      consoleRecordDelivery(mid, {
        inningsId: innings.id,
        idempotencyKey: key(),
        expectedSequence: innings.nextSequence,
        bowlerId,
        runsOffBat: 0,
        extraType: type,
        extraRuns: 1,
      }),
    );
  };

  const recordBye = (type: "BYE" | "LEG_BYE", runs: number) => {
    setByePrompt(null);
    if (!innings || !bowlerId) return;
    void run(() =>
      consoleRecordDelivery(mid, {
        inningsId: innings.id,
        idempotencyKey: key(),
        expectedSequence: innings.nextSequence,
        bowlerId,
        runsOffBat: 0,
        extraType: type,
        extraRuns: runs,
      }),
    );
  };

  /**
   * `extra` is the runs scored IN ADDITION to the automatic wide — 0 is the
   * common case (just "WB"). The total sent to the engine is 1 + extra; 4
   * extra is treated as the ball running to the boundary (no strike
   * rotation), matching how a missed wide actually reaches the rope.
   */
  const recordWide = (extra: number) => {
    setWidePrompt(false);
    if (!innings || !bowlerId) return;
    void run(() =>
      consoleRecordDelivery(mid, {
        inningsId: innings.id,
        idempotencyKey: key(),
        expectedSequence: innings.nextSequence,
        bowlerId,
        runsOffBat: 0,
        extraType: "WIDE",
        extraRuns: 1 + extra,
        extrasAreBoundary: extra === 4,
      }),
    );
  };

  const confirmWicket = (w: WicketSubmit) => {
    setWicketOpen(false);
    if (!innings || !bowlerId) return;
    void run(() =>
      consoleRecordDelivery(mid, {
        inningsId: innings.id,
        idempotencyKey: key(),
        expectedSequence: innings.nextSequence,
        bowlerId,
        runsOffBat: w.runsOffBat,
        wicket: {
          type: w.type,
          dismissedPlayerId: w.dismissedPlayerId,
          bowlerCredited: w.bowlerCredited,
          fielderId: w.fielderId,
          directHit: w.directHit,
          battersCrossed: w.battersCrossed,
          notes: w.notes,
        },
        newBatterId: w.newBatterId,
      }),
    );
  };

  const undo = () => {
    if (!innings) return;
    void run(() => consoleUndo(mid, { inningsId: innings.id }));
  };

  const swap = () => {
    if (!innings) return;
    void run(() => consoleSwapStrike(mid, { inningsId: innings.id, idempotencyKey: key() }));
  };

  // ---- Match completed ----
  if (state.matchStatus === "COMPLETED" || state.matchStatus === "ABANDONED") {
    return (
      <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
        <span style={{ color: "var(--highlight)" }}><Icon d={IC.trophy} size={28} /></span>
        <span className="t-h3">Match {state.matchStatus === "COMPLETED" ? "completed" : "abandoned"}</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Scoring is locked for this match.</span>
      </div>
    );
  }

  // ---- Match is in play but no active innings AND no next innings to start
  //      ⇒ chase resolved (target reached / all-out in innings 2) or innings 1
  //      ended in a one-innings game — show a clear "complete now" panel.
  if (!innings && !state.startInnings && state.canComplete) {
    return (
      <CompleteNowPanel
        state={state}
        busy={busy}
        error={error}
        completeOpen={completeOpen}
        setCompleteOpen={setCompleteOpen}
        onConfirmComplete={(args) => run(() => consoleCompleteMatch(state.matchId, { matchId: state.matchId, ...args }))}
        onAbandon={(reason) => run(() => consoleAbandonMatch(mid, { matchId: state.matchId, reason }))}
      />
    );
  }

  // ---- Need to start an innings ----
  if (!innings && state.startInnings) {
    return (
      <StartInningsPanel
        state={state}
        busy={busy}
        error={error}
        onStart={(args) =>
          run(() =>
            consoleStartInnings(state.matchId, {
              matchId: state.matchId,
              inningsNumber: state.startInnings!.nextNumber,
              battingTeamId: args.battingTeamId,
              openingStrikerId: args.strikerId,
              openingNonStrikerId: args.nonStrikerId,
            }),
          )
        }
        onComplete={state.canComplete ? () => setCompleteOpen(true) : undefined}
        completeOpen={completeOpen}
        setCompleteOpen={setCompleteOpen}
        onConfirmComplete={(args) => run(() => consoleCompleteMatch(state.matchId, { matchId: state.matchId, ...args }))}
      />
    );
  }

  if (!innings) {
    return (
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          This match isn&#39;t ready to score. Start it from the Matches screen first.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ScoreSummary state={state} innings={innings} />

      {error && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "10px 14px", borderRadius: 10 }}>
          <Icon d={IC.alert} size={14} /> {error}
        </div>
      )}

      <div className="grid max-md:grid-cols-1 md:grid-cols-[5fr_7fr]" style={{ gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CurrentPlayers
            innings={innings}
            battingTeamColor={state.battingTeam?.primaryColor}
            bowlingTeamColor={state.bowlingTeam?.primaryColor}
            bowlerId={bowlerId}
            onSwap={swap}
            onSelectBowler={setBowlerId}
            busy={busy}
          />
          <LastBalls innings={innings} onUndo={undo} busy={busy} />
          <MatchControls
            innings={innings}
            canComplete={state.canComplete}
            canAbandon={state.canAbandon}
            busy={busy}
            onEndInnings={() => run(() => consoleEndInnings(mid, { inningsId: innings.id, reason: "MANUAL" }))}
            onRetire={() => setRetireOpen(true)}
            onComplete={() => setCompleteOpen(true)}
            onAbandon={(reason) => run(() => consoleAbandonMatch(mid, { matchId: state.matchId, reason }))}
          />
        </div>

        <ScorePad
          disabled={needsBowler || innings.status === "COMPLETED"}
          freeHit={innings.freeHitPending}
          busy={busy}
          canUndo={innings.lastBalls.length > 0}
          onRuns={recordRuns}
          onExtra={recordExtra}
          onWicket={() => setWicketOpen(true)}
          onUndo={undo}
        />
      </div>

      {needsBowler && (
        <div style={{ fontSize: 12, color: "var(--warn)", fontWeight: 600, textAlign: "center" }}>
          New over — choose the bowler in the players panel before scoring.
        </div>
      )}

      {wicketOpen && (
        <WicketDialog
          innings={innings}
          freeHit={innings.freeHitPending}
          fielders={innings.bowlingXI}
          allOutNext={innings.wickets >= state.playersPerSide - 2}
          busy={busy}
          onConfirm={confirmWicket}
          onCancel={() => setWicketOpen(false)}
        />
      )}

      {byePrompt && (
        <RunPrompt
          title={byePrompt === "BYE" ? "Byes" : "Leg byes"}
          onPick={(r) => recordBye(byePrompt, r)}
          onCancel={() => setByePrompt(null)}
        />
      )}

      {widePrompt && (
        <WidePrompt
          onPick={recordWide}
          onCancel={() => setWidePrompt(false)}
        />
      )}

      {retireOpen && (
        <RetireDialog
          innings={innings}
          busy={busy}
          onConfirm={(args) => {
            setRetireOpen(false);
            void run(() =>
              consoleRecordRetirement(mid, {
                inningsId: innings.id,
                idempotencyKey: key(),
                playerId: args.playerId,
                type: args.type,
                newBatterId: args.newBatterId,
              }),
            );
          }}
          onCancel={() => setRetireOpen(false)}
        />
      )}

      {completeOpen && (
        <CompleteDialog
          players={state.allPlayers}
          busy={busy}
          onConfirm={(args) => {
            setCompleteOpen(false);
            void run(() => consoleCompleteMatch(state.matchId, { matchId: state.matchId, ...args }));
          }}
          onCancel={() => setCompleteOpen(false)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Summary strip
// ----------------------------------------------------------------
function ScoreSummary({ state, innings }: { state: ScoringStateDTO; innings: ConsoleInnings }) {
  const stats: [string, string][] = [
    ["Target", innings.target != null ? String(innings.target) : "—"],
    ["Need", innings.runsNeeded != null && innings.ballsRemaining != null ? `${innings.runsNeeded} (${innings.ballsRemaining})` : "—"],
    ["CRR", innings.crr],
    ["RRR", innings.rrr],
  ];
  return (
    <div style={{ background: "var(--hero-grad)", color: "var(--on-ink)", borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ gap: 8 }}>
          <StatusBadge status="LIVE" />
          <span style={{ fontSize: 11.5, color: "var(--on-ink-muted)", fontWeight: 600 }}>
            Match {state.matchNumber} · {innings.number === 1 ? "1st" : "2nd"} innings
          </span>
        </span>
        {innings.freeHitPending && <StatusBadge status="FREE_HIT" />}
      </div>
      <div className="row" style={{ gap: 22, flexWrap: "wrap" }}>
        <span className="row" style={{ gap: 8 }}>
          {state.battingTeam && <TeamLogo team={{ ...state.battingTeam, logoUrl: null }} size="sm" />}
          <span className="t-score-lg t-num" aria-live="polite">
            {innings.runs}/{innings.wickets}{" "}
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--on-ink-muted)" }}>({innings.oversDisplay})</span>
          </span>
        </span>
        <span style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: 18, marginLeft: "auto" }}>
          {stats.map(([l, v]) => (
            <span key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span className="t-label" style={{ color: "var(--on-ink-muted)", fontSize: 9.5 }}>{l}</span>
              <span className="t-num" style={{ fontSize: 15, fontWeight: 700 }}>{v}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Current players + bowler picker
// ----------------------------------------------------------------
function CurrentPlayers({
  innings,
  battingTeamColor,
  bowlingTeamColor,
  bowlerId,
  onSwap,
  onSelectBowler,
  busy,
}: {
  innings: ConsoleInnings;
  battingTeamColor?: string;
  bowlingTeamColor?: string;
  bowlerId: string | null;
  onSwap: () => void;
  onSelectBowler: (id: string) => void;
  busy: boolean;
}) {
  const batterRow = (
    b: ConsoleInnings["striker"],
    role: string,
    striker: boolean,
  ) => {
    if (!b) return null;
    return (
      <div className="row" style={{ gap: 10, padding: "9px 12px", borderRadius: 10, background: striker ? "var(--primary-soft)" : "transparent", border: striker ? "1px solid color-mix(in oklab, var(--primary) 35%, transparent)" : "1px solid transparent" }}>
        <RoleAvatar name={b.name} size={30} color={battingTeamColor} role="bat" />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {b.name} {striker && <span style={{ color: "var(--primary)" }}>•</span>}
          </span>
          <span className="t-num" style={{ fontSize: 11, color: "var(--muted)" }}>{role} · {b.runs}* ({b.balls})</span>
        </span>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="row" style={{ justifyContent: "space-between", padding: "2px 4px 6px" }}>
        <span className="t-label">At the crease</span>
        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "3px 9px", fontSize: 11 }} onClick={onSwap} disabled={busy}>
          ⇄ Swap ends
        </button>
      </div>
      {batterRow(innings.striker, "Striker", true)}
      {batterRow(innings.nonStriker, "Non-striker", false)}
      <div className="divider" style={{ margin: "6px 0" }} />
      <div className="row" style={{ gap: 10, padding: "4px 12px 6px" }}>
        <RoleAvatar name={innings.currentBowler?.name ?? "?"} size={30} color={bowlingTeamColor} role="ball" />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span className="field-label" style={{ marginBottom: 4 }}>Bowler</span>
          <span className="input" style={{ padding: "6px 10px" }}>
            <select
              value={bowlerId ?? ""}
              onChange={(e) => onSelectBowler(e.target.value)}
              disabled={busy || (!innings.atOverStart && !!innings.currentBowlerId)}
              aria-label="Select bowler"
            >
              <option value="" disabled>Select bowler…</option>
              {innings.bowlingXI.map((p) => (
                <option key={p.id} value={p.id} disabled={innings.atOverStart && p.id === innings.lastOverBowlerId}>
                  {p.name}{innings.atOverStart && p.id === innings.lastOverBowlerId ? " (just bowled)" : ""}
                </option>
              ))}
            </select>
          </span>
          {innings.currentBowler && (
            <span className="t-num" style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
              {innings.currentBowler.wickets}/{innings.currentBowler.runs} · {innings.currentBowler.overs} ov
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Last balls
// ----------------------------------------------------------------
function LastBalls({ innings, onUndo, busy }: { innings: ConsoleInnings; onUndo: () => void; busy: boolean }) {
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="t-label">Last 6 balls</span>
      {innings.lastBalls.length === 0 ? (
        <span style={{ fontSize: 12, color: "var(--muted)", padding: "6px 4px" }}>No balls yet this innings.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {innings.lastBalls.map((b, i) => (
            <div key={b.sequence} className="row" style={{ gap: 10, padding: "6px 4px", borderBottom: "1px solid var(--border)" }}>
              <span className="t-num" style={{ fontSize: 11.5, color: "var(--muted)", width: 30, flex: "none" }}>{b.overBall}</span>
              <Ball v={b.label} sm />
              <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.text}</span>
              {i === 0 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", padding: "3px 9px", fontSize: 11 }} onClick={onUndo} disabled={busy}>
                  <Icon d={IC.undo} size={12} /> Undo
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <span style={{ fontSize: 10.5, color: "var(--muted)" }}>Undo removes the latest ball and replays the rest.</span>
    </div>
  );
}

// ----------------------------------------------------------------
// Match controls
// ----------------------------------------------------------------
function MatchControls({
  innings,
  canComplete,
  canAbandon,
  busy,
  onEndInnings,
  onRetire,
  onComplete,
  onAbandon,
}: {
  innings: ConsoleInnings;
  canComplete: boolean;
  canAbandon: boolean;
  busy: boolean;
  onEndInnings: () => void;
  onRetire: () => void;
  onComplete: () => void;
  onAbandon: (reason: string) => void;
}) {
  const [abandonOpen, setAbandonOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="t-label">Match controls</span>
      <div className="grid grid-cols-2" style={{ gap: 8 }}>
        <ConfirmButton label="End innings…" className="btn btn-ghost btn-sm" busy={busy} message="End this innings now? Remaining overs are forfeited." onConfirm={onEndInnings} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetire} disabled={busy}>Retire batter…</button>
        <ConfirmButton label="Complete match…" className="btn btn-danger btn-sm" busy={busy || !canComplete} message="Complete the match and lock scoring?" onConfirm={onComplete} disabled={!canComplete} />
        <button type="button" className="btn btn-danger btn-sm" disabled={busy || !canAbandon} onClick={() => setAbandonOpen(true)}>
          Abandon match…
        </button>
      </div>
      <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
        Complete = result decided. Abandon = called off (rain, light, walkover). Both lock the match and update the public site immediately.
      </span>
      {abandonOpen && (
        <AbandonDialog
          busy={busy}
          onConfirm={(reason) => { setAbandonOpen(false); onAbandon(reason); }}
          onCancel={() => setAbandonOpen(false)}
        />
      )}
    </div>
  );
}

function AbandonDialog({ busy, onConfirm, onCancel }: { busy: boolean; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("Match abandoned");
  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 380, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="t-h3" style={{ color: "var(--danger)" }}>Abandon match</span>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          The match is locked and shows as <b>Abandoned</b> on the public site. This can&#39;t be undone from here.
        </span>
        <div>
          <span className="field-label">Reason</span>
          <span className="input"><input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Match abandoned due to rain" /></span>
        </div>
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}>Confirm abandon</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmButton({
  label,
  className,
  message,
  busy,
  disabled,
  onConfirm,
}: {
  label: string;
  className: string;
  message: string;
  busy: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} disabled={busy || disabled}>{label}</button>
      {open && (
        <ConfirmDialog message={message} busy={busy} onConfirm={() => { setOpen(false); onConfirm(); }} onCancel={() => setOpen(false)} />
      )}
    </>
  );
}

function ConfirmDialog({ message, busy, onConfirm, onCancel }: { message: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 360, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{message}</span>
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function RunPrompt({ title, onPick, onCancel }: { title: string; onPick: (r: number) => void; onCancel: () => void }) {
  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 320, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="t-h3">{title} — how many?</span>
        <div className="grid grid-cols-4" style={{ gap: 8 }}>
          {[1, 2, 3, 4].map((r) => (
            <button key={r} type="button" className="btn btn-soft" style={{ height: 52, fontFamily: "var(--font-display)", fontSize: 22 }} onClick={() => onPick(r)}>{r}</button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/**
 * Every wide is at least 1 run automatically — this asks how many MORE were
 * run (or reached the boundary). 0 stays a plain "WB"; 4 is treated as the
 * ball beating the keeper to the rope (no strike rotation), matching how a
 * missed wide actually goes for four in practice.
 */
function WidePrompt({ onPick, onCancel }: { onPick: (extra: number) => void; onCancel: () => void }) {
  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 320, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="t-h3">Wide — any extra runs?</span>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>The wide itself is always 1 run. Pick how many more were run, or reached the boundary.</span>
        <div className="grid grid-cols-5" style={{ gap: 8 }}>
          {[0, 1, 2, 3, 4].map((r) => (
            <button key={r} type="button" className="btn btn-soft" style={{ height: 52, fontFamily: "var(--font-display)", fontSize: r === 0 ? 14 : 22 }} onClick={() => onPick(r)}>
              {r === 0 ? "WB" : r}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RetireDialog({ innings, busy, onConfirm, onCancel }: { innings: ConsoleInnings; busy: boolean; onConfirm: (a: { playerId: string; type: "RETIRED_HURT" | "RETIRED_OUT"; newBatterId: string | null }) => void; onCancel: () => void }) {
  const [playerId, setPlayerId] = useState(innings.striker?.playerId ?? "");
  const [type, setType] = useState<"RETIRED_HURT" | "RETIRED_OUT">("RETIRED_HURT");
  const [newBatterId, setNewBatterId] = useState(innings.availableBatters[0]?.id ?? "");
  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 380, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="t-h3">Retire batter</span>
        <div>
          <span className="field-label">Batter</span>
          <span className="input"><select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>{innings.atCrease.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></span>
        </div>
        <div>
          <span className="field-label">Type</span>
          <span className="input"><select value={type} onChange={(e) => setType(e.target.value as "RETIRED_HURT" | "RETIRED_OUT")}><option value="RETIRED_HURT">Retired hurt (may resume)</option><option value="RETIRED_OUT">Retired out (counts as wicket)</option></select></span>
        </div>
        <div>
          <span className="field-label">Replacement batter</span>
          <span className="input"><select value={newBatterId} onChange={(e) => setNewBatterId(e.target.value)}>{innings.availableBatters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></span>
        </div>
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onConfirm({ playerId, type, newBatterId: newBatterId || null })}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function CompleteDialog({ players, busy, onConfirm, onCancel }: { players: ScoringStateDTO["allPlayers"]; busy: boolean; onConfirm: (a: { playerOfMatchId?: string; resultText?: string }) => void; onCancel: () => void }) {
  const [pom, setPom] = useState("");
  const [result, setResult] = useState("");
  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 400, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="t-h3" style={{ color: "var(--danger)" }}>Complete match</span>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>The result is auto-computed from the chase. Override it only if needed.</span>
        <div>
          <span className="field-label">Player of the match</span>
          <span className="input"><select value={pom} onChange={(e) => setPom(e.target.value)}><option value="">— choose later —</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></span>
        </div>
        <div>
          <span className="field-label">Result text (optional override)</span>
          <span className="input"><input type="text" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Auto — e.g. CS Titans won by 6 wickets" /></span>
        </div>
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onConfirm({ playerOfMatchId: pom || undefined, resultText: result.trim() || undefined })}>Complete match</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Start innings
// ----------------------------------------------------------------
function CompleteNowPanel({
  state,
  busy,
  error,
  completeOpen,
  setCompleteOpen,
  onConfirmComplete,
  onAbandon,
}: {
  state: ScoringStateDTO;
  busy: boolean;
  error: string | null;
  completeOpen: boolean;
  setCompleteOpen: (v: boolean) => void;
  onConfirmComplete: (a: { playerOfMatchId?: string; resultText?: string }) => void;
  onAbandon: (reason: string) => void;
}) {
  const [abandonOpen, setAbandonOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", borderColor: "var(--highlight)" }}>
      <span style={{ color: "var(--highlight)" }}><Icon d={IC.trophy} size={32} /></span>
      <span className="t-h3">Match ready to complete</span>
      <span style={{ fontSize: 13, color: "var(--muted)", maxWidth: 360 }}>
        Tap <b>Complete match</b> — the result is auto-derived from the chase
        and the public site updates instantly. Use <b>Abandon</b> only if the
        game was called off.
      </span>
      {error && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}>
          <Icon d={IC.alert} size={14} /> {error}
        </div>
      )}
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbandonOpen(true)} disabled={busy}>
          Abandon…
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setCompleteOpen(true)} disabled={busy}>
          <Icon d={IC.check2} size={15} /> Complete match
        </button>
      </div>
      {completeOpen && (
        <CompleteDialog
          players={state.allPlayers}
          busy={busy}
          onConfirm={(args) => { setCompleteOpen(false); onConfirmComplete(args); }}
          onCancel={() => setCompleteOpen(false)}
        />
      )}
      {abandonOpen && (
        <AbandonDialog
          busy={busy}
          onConfirm={(reason) => { setAbandonOpen(false); onAbandon(reason); }}
          onCancel={() => setAbandonOpen(false)}
        />
      )}
    </div>
  );
}

function StartInningsPanel({
  state,
  busy,
  error,
  onStart,
  onComplete,
  completeOpen,
  setCompleteOpen,
  onConfirmComplete,
}: {
  state: ScoringStateDTO;
  busy: boolean;
  error: string | null;
  onStart: (a: { battingTeamId: string; strikerId: string; nonStrikerId: string }) => void;
  onComplete?: () => void;
  completeOpen: boolean;
  setCompleteOpen: (v: boolean) => void;
  onConfirmComplete: (a: { playerOfMatchId?: string; resultText?: string }) => void;
}) {
  const si = state.startInnings!;
  const [teamId, setTeamId] = useState(si.options[0]?.team.id ?? "");
  const xi = si.options.find((o) => o.team.id === teamId)?.xi ?? [];
  const [strikerId, setStrikerId] = useState(xi[0]?.id ?? "");
  const [nonStrikerId, setNonStrikerId] = useState(xi[1]?.id ?? "");

  return (
    <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16, maxWidth: 460 }}>
      <span className="t-h3">Start {si.nextNumber === 1 ? "1st" : "2nd"} innings</span>
      {error && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}><Icon d={IC.alert} size={14} /> {error}</div>
      )}
      <div>
        <span className="field-label">Batting team</span>
        <span className="input">
          <select value={teamId} onChange={(e) => { setTeamId(e.target.value); const newXi = si.options.find((o) => o.team.id === e.target.value)?.xi ?? []; setStrikerId(newXi[0]?.id ?? ""); setNonStrikerId(newXi[1]?.id ?? ""); }}>
            {si.options.map((o) => <option key={o.team.id} value={o.team.id}>{o.team.name}</option>)}
          </select>
        </span>
      </div>
      <div className="grid grid-cols-2" style={{ gap: 12 }}>
        <div>
          <span className="field-label">Striker</span>
          <span className="input"><select value={strikerId} onChange={(e) => setStrikerId(e.target.value)}>{xi.map((p) => <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>{p.name}</option>)}</select></span>
        </div>
        <div>
          <span className="field-label">Non-striker</span>
          <span className="input"><select value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value)}>{xi.map((p) => <option key={p.id} value={p.id} disabled={p.id === strikerId}>{p.name}</option>)}</select></span>
        </div>
      </div>
      <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
        {onComplete && (
          <button type="button" className="btn btn-danger btn-sm" onClick={onComplete} disabled={busy}>Complete match…</button>
        )}
        <button type="button" className="btn btn-primary" disabled={busy || !strikerId || !nonStrikerId || strikerId === nonStrikerId} onClick={() => onStart({ battingTeamId: teamId, strikerId, nonStrikerId })}>
          {busy ? "Starting…" : "Start innings"}
        </button>
      </div>
      {completeOpen && (
        <CompleteDialog players={state.allPlayers} busy={busy} onConfirm={(a) => { setCompleteOpen(false); onConfirmComplete(a); }} onCancel={() => setCompleteOpen(false)} />
      )}
    </div>
  );
}
