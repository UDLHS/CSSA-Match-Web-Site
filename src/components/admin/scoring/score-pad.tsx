"use client";

import { Icon, IC } from "@/components/public/icons";

/**
 * One-tap scoring pad (design-spec §C). 0–6 grid (4 blue, 6 violet),
 * extras row (amber), WICKET (red, 2-span) + Undo. On a free hit the
 * WICKET button dims — only run-out is allowed, enforced in the dialog.
 */
export function ScorePad({
  disabled,
  freeHit,
  busy,
  onRuns,
  onExtra,
  onWicket,
  onUndo,
  canUndo,
}: {
  disabled: boolean;
  freeHit: boolean;
  busy: boolean;
  onRuns: (runs: number) => void;
  onExtra: (type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE") => void;
  onWicket: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const padBtn = (label: string, onClick: () => void, kind: "run" | "four" | "six") => {
    const style: React.CSSProperties = {
      height: 64,
      borderRadius: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 24,
      cursor: disabled || busy ? "not-allowed" : "pointer",
      border: "1px solid var(--border)",
      background: "var(--surface)",
      color: "var(--text)",
      boxShadow: "0 1px 2px rgba(16,26,58,.08)",
      opacity: disabled ? 0.5 : 1,
    };
    if (kind === "four") Object.assign(style, { background: "var(--ball-four)", color: "#fff", borderColor: "transparent" });
    if (kind === "six") Object.assign(style, { background: "var(--ball-six)", color: "#fff", borderColor: "transparent" });
    return (
      <button key={label} type="button" disabled={disabled || busy} onClick={onClick} style={style}>
        {label}
      </button>
    );
  };

  const extraBtn = (label: string, type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE") => (
    <button
      key={label}
      type="button"
      disabled={disabled || busy}
      onClick={() => onExtra(type)}
      style={{
        height: 56,
        borderRadius: 14,
        fontWeight: 700,
        fontSize: 14,
        cursor: disabled || busy ? "not-allowed" : "pointer",
        background: "color-mix(in oklab, var(--warn) 12%, var(--surface))",
        color: "var(--warn)",
        border: "1px solid color-mix(in oklab, var(--warn) 35%, transparent)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <span className="t-label">Score this ball — one tap</span>
        {freeHit && (
          <span className="row" style={{ gap: 6, fontSize: 11.5, color: "var(--warn)", fontWeight: 700 }}>
            ⚡ FREE HIT — dismissals limited to run-out
          </span>
        )}
      </div>

      <div className="grid grid-cols-3" style={{ gap: 10 }}>
        {[0, 1, 2, 3, 4, 6].map((r) =>
          padBtn(String(r), () => onRuns(r), r === 4 ? "four" : r === 6 ? "six" : "run"),
        )}
      </div>

      <div className="grid grid-cols-4" style={{ gap: 10 }}>
        {extraBtn("Wide", "WIDE")}
        {extraBtn("No ball", "NO_BALL")}
        {extraBtn("Bye", "BYE")}
        {extraBtn("Leg bye", "LEG_BYE")}
      </div>

      <div className="grid grid-cols-[2fr_1fr]" style={{ gap: 10 }}>
        <button
          type="button"
          disabled={disabled || freeHit || busy}
          onClick={onWicket}
          style={{
            height: 64,
            borderRadius: 14,
            background: "var(--danger)",
            color: "#fff",
            border: "none",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: ".04em",
            cursor: disabled || freeHit || busy ? "not-allowed" : "pointer",
            opacity: disabled || freeHit ? 0.45 : 1,
          }}
        >
          WICKET
        </button>
        <button
          type="button"
          disabled={!canUndo || busy}
          onClick={onUndo}
          className="row"
          style={{
            height: 64,
            borderRadius: 14,
            justifyContent: "center",
            gap: 8,
            border: "1.5px solid var(--border)",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--text)",
            background: "var(--surface-2)",
            cursor: !canUndo || busy ? "not-allowed" : "pointer",
            opacity: canUndo ? 1 : 0.5,
          }}
        >
          <Icon d={IC.undo} size={16} /> Undo
        </button>
      </div>
      {freeHit && (
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Wicket is dimmed during a free hit — only run-out is allowed.
        </span>
      )}
    </div>
  );
}
