/* eslint-disable @next/next/no-img-element */

const PARTNERS = [
  "Title Sponsor",
  "Co-Sponsor",
  "Beverage Partner",
  "Media Partner",
  "Campus Store",
];

export function SiteFooter() {
  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "var(--on-ink-muted)",
        padding: "26px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="t-label" style={{ color: "var(--on-ink-muted)" }}>Our partners</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PARTNERS.map((p) => (
            <span
              key={p}
              style={{
                height: 38,
                padding: "0 16px",
                borderRadius: 8,
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--on-ink)",
              }}
            >
              <span style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(255,255,255,.18)" }} />
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="divider" style={{ background: "rgba(255,255,255,.12)" }} />
      <div
        className="row"
        style={{ gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <span className="row" style={{ gap: 10 }}>
          <img src="/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--on-ink)" }}>
            CSSA CRICKET FIESTA &#39;26
          </span>
        </span>
        <span style={{ fontSize: 12 }}>
          © 2026 Computer Science Students&#39; Association · University of Kelaniya
        </span>
      </div>
    </footer>
  );
}
