"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { wipeTestData } from "@/server/actions/data-reset";
import { Panel } from "@/components/admin/kit";
import { Icon, IC } from "@/components/public/icons";

const CONFIRM_PHRASE = "DELETE ALL DATA";

interface Counts {
  teams: number;
  players: number;
  matches: number;
}

/**
 * "Danger zone" — irreversibly wipes every team/player/match (and everything
 * derived from them) so a tournament can start clean after testing. Counts
 * are passed in from the page (server-fetched) and refreshed via
 * router.refresh() after a successful wipe, same as the rest of admin.
 */
export function DataResetPanel({ counts }: { counts: Counts }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Counts | null>(null);

  const empty = counts.teams === 0 && counts.players === 0 && counts.matches === 0;

  const close = () => { setOpen(false); setError(null); };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await wipeTestData();
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setResult(res.data);
    setOpen(false);
    router.refresh();
  };

  return (
    <Panel title="Danger zone" sub="Irreversible — only for clearing test data before the real tournament starts">
      {result && (
        <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--live, #16a34a)", marginBottom: 12 }}>
          <Icon d={IC.check2} size={14} /> Removed {result.teams} teams, {result.players} players, {result.matches} matches.
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Currently in the system: <b>{counts.teams}</b> teams, <b>{counts.players}</b> players, <b>{counts.matches}</b> matches.
          This permanently deletes all of it — venues, sponsors and admin accounts are not affected.
        </span>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={empty}
          onClick={() => setOpen(true)}
        >
          <Icon d={IC.trash} size={14} /> Clear test data
        </button>
      </div>

      {open && <ConfirmWipeDialog busy={busy} error={error} onConfirm={confirm} onCancel={close} />}
    </Panel>
  );
}

function ConfirmWipeDialog({
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const ready = typed === CONFIRM_PHRASE;

  return (
    <div className="overlay" onClick={onCancel} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card" style={{ width: 420, maxWidth: "100%", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="t-h3" style={{ color: "var(--danger)" }}>
          <Icon d={IC.alert} size={15} /> Clear all test data
        </span>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          This deletes every team, player and match — and everything derived from them
          (deliveries, scorecards, stats, leaderboard snapshots, the points table). It cannot
          be undone. Venues, sponsors, tournament settings and admin accounts are kept.
        </span>
        {error && (
          <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--danger)" }}>
            <Icon d={IC.alert} size={13} /> {error}
          </div>
        )}
        <div>
          <span className="field-label">Type <code>{CONFIRM_PHRASE}</code> to confirm</span>
          <span className="input">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              autoFocus
            />
          </span>
        </div>
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger btn-sm" disabled={busy || !ready} onClick={onConfirm}>
            {busy ? "Clearing…" : "Permanently delete everything"}
          </button>
        </div>
      </div>
    </div>
  );
}
