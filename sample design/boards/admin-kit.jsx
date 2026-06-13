// boards/admin-kit.jsx — reusable atoms for admin management screens
function PageHead({ title, sub, actions }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span className="t-h2">{title}</span>
        {sub ? <span className="t-small" style={{ color: "var(--text-muted)" }}>{sub}</span> : null}
      </div>
      <div className="row" style={{ gap: 10 }}>{actions}</div>
    </div>
  );
}

function SearchBar({ ph, w }) {
  return (
    <span className="input" style={{ flex: w ? `0 0 ${w}px` : "0 0 250px" }}>
      <span style={{ color: "var(--text-muted)" }}><Icon d={IC.search} size={15} /></span>
      <span className="ph">{ph || "Search…"}</span>
    </span>
  );
}
function SelectBox({ value, w, icon }) {
  return (
    <span className="input" style={{ flex: w ? `0 0 ${w}px` : "0 0 168px", justifyContent: "space-between" }}>
      <span className="row" style={{ gap: 8 }}>{icon ? <span style={{ color: "var(--text-muted)" }}><Icon d={icon} size={14} /></span> : null}{value}</span>
      <span style={{ color: "var(--text-muted)" }}><ChevR /></span>
    </span>
  );
}

function Field({ label, req, hint, error, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, minWidth: 0 }}>
      {label ? <span className="field-label">{label}{req ? <span style={{ color: "var(--danger)" }}> *</span> : null}</span> : null}
      {children}
      {error ? <span className="field-error"><Icon d={IC.alert} size={12} /> {error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
function TextIn({ value, ph, error, mono }) {
  return <span className={"input" + (error ? " is-error" : "")}>{value ? <span className={mono ? "t-num" : ""}>{value}</span> : <span className="ph">{ph}</span>}</span>;
}
function SelectIn({ value, ph }) {
  return <span className="input" style={{ justifyContent: "space-between" }}>{value ? <span>{value}</span> : <span className="ph">{ph}</span>}<span style={{ color: "var(--text-muted)" }}><ChevR /></span></span>;
}
function NumIn({ value, suffix }) {
  return (
    <span className="input" style={{ justifyContent: "space-between" }}>
      <span className="t-num">{value}{suffix ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> {suffix}</span> : null}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 1, color: "var(--text-muted)" }}>
        <Icon d={IC.plus} size={11} /><Icon d={IC.minus} size={11} />
      </span>
    </span>
  );
}
function TextArea({ value, ph, rows }) {
  return <span className="input" style={{ alignItems: "flex-start", minHeight: (rows || 3) * 19 + 18 }}>{value ? <span style={{ lineHeight: 1.5 }}>{value}</span> : <span className="ph">{ph}</span>}</span>;
}
function ColorIn({ hex, error }) {
  return (
    <span className={"input" + (error ? " is-error" : "")} style={{ gap: 10 }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, background: hex, border: "1px solid var(--border)", flex: "none" }}></span>
      <span className="t-num">{hex}</span>
      <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}><ChevR /></span>
    </span>
  );
}
function Toggle({ on }) {
  return (
    <span style={{ width: 38, height: 22, borderRadius: 999, background: on ? "var(--primary)" : "var(--surface-2)", border: "1px solid var(--border)", position: "relative", flex: "none", display: "inline-block" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}></span>
    </span>
  );
}
function ToggleRow({ label, sub, on }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 14, padding: "8px 0" }}>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {sub ? <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{sub}</span> : null}
      </span>
      <Toggle on={on} />
    </div>
  );
}
function Radio({ options, active }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      {options.map(o => (
        <span key={o} className="row" style={{ gap: 7, padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
          border: o === active ? "1.5px solid var(--primary)" : "1px solid var(--border)",
          background: o === active ? "var(--primary-soft)" : "var(--surface)", color: o === active ? "var(--primary)" : "var(--text)" }}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", border: o === active ? "4px solid var(--primary)" : "2px solid var(--border)", flex: "none" }}></span>{o}
        </span>
      ))}
    </div>
  );
}
function Segmented({ options, active }) {
  return <span className="tabs">{options.map(o => <span key={o} className="tab" {...(o === active ? { "data-active": "" } : {})}>{o}</span>)}</span>;
}
function IconBtn({ d, danger, primary }) {
  return (
    <span style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none",
      color: danger ? "var(--danger)" : primary ? "var(--primary)" : "var(--text-muted)", background: "var(--surface)", cursor: "pointer" }}>
      <Icon d={d} size={15} />
    </span>
  );
}
function RowActions({ onlyEdit }) {
  return <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}><IconBtn d={IC.edit} primary />{onlyEdit ? null : <IconBtn d={IC.trash} danger />}</span>;
}
function StatusPill({ s }) {
  if (s === "Live") return <Badge type="live" />;
  const map = { Active: "badge-completed", Scheduled: "badge-upcoming", Draft: "badge-abandoned", Completed: "badge-completed",
    Injured: "badge-break", Paused: "badge-break", Closed: "badge-abandoned", Open: "badge-completed", Suspended: "badge-abandoned", Pending: "badge-break" };
  return <span className={"badge " + (map[s] || "badge-upcoming")}>{s}</span>;
}
function FormActions({ saveLabel, extra }) {
  return (
    <div className="row" style={{ gap: 10, justifyContent: "flex-end", paddingTop: 6, borderTop: "1px solid var(--border)", marginTop: 4 }}>
      {extra || null}
      <span className="btn btn-ghost">Cancel</span>
      <span className="btn btn-primary"><Icon d={IC.check2} size={15} /> {saveLabel || "Save changes"}</span>
    </div>
  );
}
function Panel({ title, sub, children, actions, pad }) {
  return (
    <div className="card" style={{ padding: pad === undefined ? 18 : pad, display: "flex", flexDirection: "column", gap: 14 }}>
      {(title || actions) ? (
        <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {title ? <span className="t-h3">{title}</span> : null}
            {sub ? <span className="t-small" style={{ color: "var(--text-muted)" }}>{sub}</span> : null}
          </span>
          {actions ? <span className="row" style={{ gap: 8 }}>{actions}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
function UploadField({ children, hint, tall }) {
  return (
    <div style={{ border: "1.5px dashed var(--border)", borderRadius: 12, padding: tall ? 20 : 14, display: "flex", alignItems: "center", gap: 12, background: "var(--surface-2)" }}>
      {children}
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{hint || <span>Drop file or <span style={{ color: "var(--primary)", fontWeight: 600 }}>browse</span></span>}</span>
    </div>
  );
}
function TableWrap({ children }) {
  return <div className="card" style={{ padding: 0, overflow: "hidden" }}><table className="stat">{children}</table></div>;
}

Object.assign(window, {
  PageHead, SearchBar, SelectBox, Field, TextIn, SelectIn, NumIn, TextArea, ColorIn,
  Toggle, ToggleRow, Radio, Segmented, IconBtn, RowActions, StatusPill, FormActions, Panel, UploadField, TableWrap,
});
