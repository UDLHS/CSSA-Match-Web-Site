/** Display formatting helpers — public UI only (no scoring math here). */

export function fmtRate(n: number | null | undefined, digits = 2): string {
  return n == null ? "—" : n.toFixed(digits);
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDateShort(iso)} · ${fmtTime(iso)}`;
}

/** "Nuwanidu Shanaka" → "N. Shanaka" (board-style short names). */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export function strikeRateOf(runs: number, balls: number): string {
  return balls > 0 ? ((runs / balls) * 100).toFixed(1) : "—";
}

/** Net run rate, signed to 3dp ("+2.259" / "-3.415"); "—" when not yet computable. */
export function fmtNrr(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(3)}`;
}
