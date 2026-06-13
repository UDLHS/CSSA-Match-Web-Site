"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, IC } from "./icons";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Matches", href: "/matches" },
  { label: "Squads", href: "/players" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Popular", href: "/popular" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // Close the drawer on navigation and lock body scroll while open.
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className="row"
      style={{
        justifyContent: "space-between",
        padding: "12px 16px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <Link href="/" className="row" style={{ gap: 10, textDecoration: "none", color: "var(--text)" }}>
        <img
          src="/logo.png"
          alt="CSSA Cricket Fiesta"
          style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }}
        />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "0.02em",
            }}
          >
            CRICKET FIESTA &#39;26
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: "0.14em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            CSSA · University of Kelaniya
          </span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="row max-md:hidden" style={{ gap: 26 }} aria-label="Main">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
              color: isActive(l.href) ? "var(--primary)" : "var(--muted)",
              boxShadow: isActive(l.href) ? "0 14px 0 -12px var(--primary)" : "none",
              paddingBottom: 2,
            }}
            aria-current={isActive(l.href) ? "page" : undefined}
          >
            {l.label}
          </Link>
        ))}
        <span className="row" style={{ gap: 14, marginLeft: 8 }}>
          <ThemeToggle />
          <Link href="/admin" className="btn btn-ghost btn-sm" style={{ textDecoration: "none" }}>
            <Icon d={IC.shield} size={14} /> Admin
          </Link>
        </span>
      </nav>

      {/* Mobile: theme + hamburger → left sheet */}
      <span className="row md:hidden" style={{ gap: 12 }}>
        <ThemeToggle />
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
          style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 4 }}
        >
          <Icon d={IC.menu} size={21} />
        </button>
      </span>

      {drawer && (
        <div className="overlay md:hidden" onClick={() => setDrawer(false)}>
          <nav
            aria-label="Main"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: 270,
              background: "var(--surface)",
              borderRight: "1px solid var(--border)",
              padding: "18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <span className="row" style={{ gap: 8 }}>
                <img src="/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }} />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
                  CRICKET FIESTA &#39;26
                </span>
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4 }}
              >
                <Icon d={IC.x} size={16} />
              </button>
            </div>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: "11px 12px",
                  borderRadius: 10,
                  fontSize: 14.5,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: isActive(l.href) ? "var(--primary)" : "var(--text)",
                  background: isActive(l.href) ? "var(--primary-soft)" : "transparent",
                }}
                aria-current={isActive(l.href) ? "page" : undefined}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/admin"
              className="btn btn-ghost btn-sm"
              style={{ textDecoration: "none", marginTop: "auto", justifyContent: "center" }}
            >
              <Icon d={IC.shield} size={14} /> Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
