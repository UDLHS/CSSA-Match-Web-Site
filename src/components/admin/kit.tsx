import type { CSSProperties, ReactNode } from "react";
import { Icon, IC } from "@/components/public/icons";

/**
 * Admin management kit — presentational primitives ported from
 * sample design/boards/admin-kit.jsx. No "use client": these render on the
 * server; interactive forms compose them with native inputs + RHF.
 */

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <h2 className="t-h2">{title}</h2>
        {sub ? <span className="t-small" style={{ color: "var(--muted)" }}>{sub}</span> : null}
      </div>
      {actions ? <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  sub,
  actions,
  children,
  pad,
  style,
}: {
  title?: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <div className="card" style={{ padding: pad === undefined ? 18 : pad, display: "flex", flexDirection: "column", gap: 14, ...style }}>
      {title || actions ? (
        <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {title ? <span className="t-h3">{title}</span> : null}
            {sub ? <span className="t-small" style={{ color: "var(--muted)" }}>{sub}</span> : null}
          </span>
          {actions ? <span className="row" style={{ gap: 8 }}>{actions}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Field({
  label,
  req,
  hint,
  error,
  children,
  span,
}: {
  label?: string;
  req?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  span?: number;
}) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
      {label ? (
        <label className="field-label">
          {label}
          {req ? <span style={{ color: "var(--danger)" }}> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="field-error" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon d={IC.alert} size={12} /> {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="stat">{children}</table>
      </div>
    </div>
  );
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  ACTIVE: { cls: "badge-completed", label: "Active" },
  PENDING: { cls: "badge-break", label: "Pending" },
  SUSPENDED: { cls: "badge-abandoned", label: "Suspended" },
  INJURED: { cls: "badge-break", label: "Injured" },
  DRAFT: { cls: "badge-abandoned", label: "Draft" },
  UPCOMING: { cls: "badge-upcoming", label: "Upcoming" },
  LIVE: { cls: "badge-live", label: "LIVE" },
  INNINGS_BREAK: { cls: "badge-break", label: "Innings break" },
  COMPLETED: { cls: "badge-completed", label: "Completed" },
  ABANDONED: { cls: "badge-abandoned", label: "Abandoned" },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? { cls: "badge-upcoming", label: status };
  return (
    <span className={`badge ${m.cls}`}>
      {status === "LIVE" && <span className="pulse" />}
      {m.label}
    </span>
  );
}

export function EmptyState({
  icon = IC.search,
  title,
  sub,
  action,
}: {
  icon?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
        <Icon d={icon} size={20} />
      </span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      {sub ? <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{sub}</span> : null}
      {action ? <div style={{ marginTop: 4 }}>{action}</div> : null}
    </div>
  );
}

/** Toolbar filter row wrapper. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
      {children}
    </div>
  );
}
