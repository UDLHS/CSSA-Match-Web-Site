/* eslint-disable @next/next/no-img-element */
import { getFooterPartners } from "@/server/queries/ads";

/**
 * Footer. The "Our partners" strip lists ACTIVE sponsors from the database and
 * is hidden entirely when there are none — no placeholder chips. New sponsors
 * appear live (each page's PageTicker re-renders the layout).
 */
export async function SiteFooter() {
  const partners = await getFooterPartners();

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
      {partners.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="t-label" style={{ color: "var(--on-ink-muted)" }}>Our partners</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {partners.map((p) => {
              const chip = (
                <span
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
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} />
                  ) : (
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(255,255,255,.18)" }} />
                  )}
                  {p.name}
                </span>
              );
              return p.websiteUrl ? (
                <a key={p.id} href={p.websiteUrl} target="_blank" rel="noopener noreferrer sponsored" style={{ textDecoration: "none" }}>
                  {chip}
                </a>
              ) : (
                <span key={p.id}>{chip}</span>
              );
            })}
          </div>
        </div>
      )}
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
