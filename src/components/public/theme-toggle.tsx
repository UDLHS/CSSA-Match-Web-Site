"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

/** Theme toggle — cycles light → dark → system (design-spec "Stack"). */
export function ThemeToggle({ onInk = false }: { onInk?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("cf-theme") as ThemeMode) || "system";
    setMode(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("cf-theme") as ThemeMode) || "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const cycle = () => {
    const next: ThemeMode =
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    localStorage.setItem("cf-theme", next);
    applyTheme(next);
  };

  const label =
    mode === "light" ? "Light theme" : mode === "dark" ? "Dark theme" : "System theme";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label} — click to switch`}
      title={label}
      className="row"
      style={{
        gap: 0,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: onInk ? "var(--on-ink-muted)" : "var(--muted)",
        padding: 4,
      }}
    >
      {mode === "dark" ? <MoonIcon /> : mode === "system" ? <AutoIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
    </svg>
  );
}
