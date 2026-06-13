"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Icon, IC } from "@/components/public/icons";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Full reload so middleware/RSC pick up the new session cookies.
    router.replace(next);
    router.refresh();
  };

  return (
    <div
      className="card"
      style={{ width: 380, maxWidth: "100%", padding: 28, display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div className="row" style={{ gap: 12 }}>
        <img src="/logo.png" alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19 }}>FIESTA ADMIN</span>
          <span style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)" }}>
            Scoring &amp; management console
          </span>
        </span>
      </div>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <span className="input">
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cssa.lk"
            />
          </span>
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <span className="input">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </span>
        </div>

        {error && (
          <div
            className="row"
            style={{ gap: 8, fontSize: 12.5, color: "var(--danger)", background: "color-mix(in oklab, var(--danger) 10%, transparent)", padding: "9px 12px", borderRadius: 10 }}
          >
            <Icon d={IC.alert} size={14} /> {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ justifyContent: "center", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0, textAlign: "center" }}>
        Authorised tournament staff only. Every action is audit-logged.
      </p>
    </div>
  );
}
