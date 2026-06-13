"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startMatch } from "@/server/actions/match-lifecycle";
import { Icon, IC } from "@/components/public/icons";

/** Flips an UPCOMING match to LIVE so scoring can begin. */
export function StartMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    const res = await startMatch(matchId);
    if (!res.ok) {
      setError(res.error.message);
      setBusy(false);
      return;
    }
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={busy}>
        <Icon d={IC.bolt} size={15} /> {busy ? "Starting…" : "Start match"}
      </button>
      {error && (
        <span className="row" style={{ gap: 6, fontSize: 12.5, color: "var(--danger)" }}>
          <Icon d={IC.alert} size={13} /> {error}
        </span>
      )}
    </div>
  );
}
