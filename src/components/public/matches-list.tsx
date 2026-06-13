"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveSnapshotRead } from "@/lib/live-types";
import { MatchCard } from "./match-card";
import { Icon, IC } from "./icons";

type Tab = "Live" | "Upcoming" | "Previous";

/** /matches — tabbed card grid (cards open the full scorecard page). */
export function MatchesList({
  live,
  upcoming,
  previous,
}: {
  live: LiveSnapshotRead[];
  upcoming: LiveSnapshotRead[];
  previous: LiveSnapshotRead[];
}) {
  const [tab, setTab] = useState<Tab>(live.length > 0 ? "Live" : "Upcoming");
  const router = useRouter();
  const open = (id: string) => router.push(`/matches/${id}`);

  const lists: Record<Tab, LiveSnapshotRead[]> = {
    Live: live,
    Upcoming: upcoming,
    Previous: previous,
  };
  const cards = lists[tab];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="tabs" role="tablist" aria-label="Match status" style={{ alignSelf: "flex-start" }}>
        {(Object.keys(lists) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            className="tab"
            {...(t === tab ? { "data-active": "" } : {})}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Live" && live.length > 0 && (
              <span style={{ marginLeft: 6, display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--live)" }} />
            )}
          </button>
        ))}
      </span>
      {cards.length === 0 ? (
        <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
            <Icon d={IC.clock} size={20} />
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {tab === "Live" ? "No live matches right now" : tab === "Upcoming" ? "No upcoming fixtures" : "No completed matches yet"}
          </span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {tab === "Live" && upcoming.length > 0
              ? "Check the Upcoming tab for the next fixture."
              : "New fixtures appear here as soon as they are published."}
          </span>
        </div>
      ) : (
        <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 14 }}>
          {cards.map((s) => (
            <MatchCard key={s.matchId} snap={s} onOpen={open} />
          ))}
        </div>
      )}
    </div>
  );
}
