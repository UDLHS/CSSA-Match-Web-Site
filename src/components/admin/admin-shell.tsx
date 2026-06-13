"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminRole } from "@prisma/client";
import { Icon, IC } from "@/components/public/icons";
import { Avatar } from "@/components/public/atoms";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { navItemsForRole, ROLE_LABEL, type NavItem } from "./admin-nav";
import { signOut } from "@/server/actions/auth";

/**
 * Admin chrome — 220px ink sidebar + topbar (design-spec admin layout).
 * Dark "ink" so a scorer can never confuse it with the public site.
 * Active item gets the gold inset bar; Live Scoring shows a red dot.
 */
export function AdminShell({
  role,
  name,
  email,
  liveActive,
  children,
}: {
  role: AdminRole;
  name: string;
  email: string;
  liveActive: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const items = navItemsForRole(role);

  useEffect(() => setDrawer(false), [pathname]);

  const title =
    items.find((i) => i.href !== "/admin" && pathname.startsWith(i.href))?.label ??
    (pathname === "/admin" ? "Dashboard" : "Admin");

  return (
    <div style={{ display: "flex", background: "var(--background)", minHeight: "100dvh" }}>
      {/* Desktop sidebar */}
      <aside className="max-md:hidden" style={{ width: 220, flex: "none" }}>
        <Sidebar items={items} pathname={pathname} liveActive={liveActive} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="overlay md:hidden" onClick={() => setDrawer(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 240, height: "100%" }}>
            <Sidebar items={items} pathname={pathname} liveActive={liveActive} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <header
          className="row"
          style={{ justifyContent: "space-between", padding: "12px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 30 }}
        >
          <span className="row" style={{ gap: 10 }}>
            <button
              type="button"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setDrawer(true)}
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 2 }}
            >
              <Icon d={IC.menu} size={20} />
            </button>
            <span className="t-h3">{title}</span>
          </span>
          <span className="row" style={{ gap: 12 }}>
            <ThemeToggle />
            <span className="row" style={{ gap: 8 }}>
              <Avatar name={name} size={28} color="var(--primary)" />
              <span className="max-md:hidden" style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{name}</span>
                <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{ROLE_LABEL[role]}</span>
              </span>
            </span>
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost btn-sm" title="Sign out">
                <Icon d={IC.logout} size={14} />
                <span className="max-md:hidden">Logout</span>
              </button>
            </form>
          </span>
        </header>

        <main style={{ padding: "clamp(14px, 2vw, 24px)", display: "flex", flexDirection: "column", gap: 18 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  items,
  pathname,
  liveActive,
}: {
  items: NavItem[];
  pathname: string;
  liveActive: boolean;
}) {
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--ink)",
        color: "var(--on-ink-muted)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 12px",
        gap: 4,
        minHeight: "100dvh",
      }}
    >
      <Link href="/admin" className="row" style={{ gap: 9, padding: "0 8px 16px", textDecoration: "none" }}>
        <img src="/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: "cover" }} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--on-ink)" }}>FIESTA ADMIN</span>
          <span style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase" }}>Scoring console</span>
        </span>
      </Link>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="row"
            style={{
              gap: 10,
              padding: "9px 10px",
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              background: active ? "rgba(255,255,255,.12)" : "transparent",
              color: active ? "var(--on-ink)" : "var(--on-ink-muted)",
              boxShadow: active ? "inset 3px 0 0 var(--highlight)" : "none",
            }}
            aria-current={active ? "page" : undefined}
          >
            <Icon d={item.icon} size={16} />
            {item.label}
            {item.liveDot && liveActive && !active ? (
              <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "var(--live)" }} />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
