"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveSnapshotRead } from "@/lib/live-types";

const FALLBACK_POLL_MS = 15_000;

/**
 * Live snapshot subscription (backend-spec §7 read model).
 *
 * Primary transport is SSE (`/api/matches/:id/stream`) — the server pushes
 * the snapshot the instant its version changes. A slow polling loop runs as a
 * safety net to cover any SSE gap (serverless window close, transient drop).
 * Both read the SAME denormalized row, so they can never disagree.
 */
export function useLiveSnapshot(initial: LiveSnapshotRead | null) {
  const [snap, setSnap] = useState(initial);
  const [degraded, setDegraded] = useState(false);
  const lastEventAt = useRef(Date.now());

  // When the parent server component re-renders with a different `initial`
  // (e.g. the home page's "featured match" changes from upcoming to live), or
  // a strictly newer version arrives, swap to it. Otherwise the hook would
  // stay frozen on the first render's snapshot.
  useEffect(() => {
    if (!initial) {
      if (snap) setSnap(null);
      return;
    }
    if (!snap || initial.matchId !== snap.matchId || initial.version > snap.version) {
      setSnap(initial);
    }
  }, [initial, snap]);

  const matchId = snap?.matchId;
  const inPlay = snap?.status === "LIVE" || snap?.status === "INNINGS_BREAK";

  // Keep the latest version in a ref so the poll's `since` is always current
  // without re-subscribing on every update.
  const versionRef = useRef(snap?.version ?? 0);
  versionRef.current = snap?.version ?? 0;

  // ---- SSE ----
  useEffect(() => {
    if (!matchId || !inPlay || typeof EventSource === "undefined") return;
    const es = new EventSource(`/api/matches/${matchId}/stream`);

    const onSnapshot = (e: MessageEvent) => {
      lastEventAt.current = Date.now();
      setDegraded(false);
      try {
        const data = JSON.parse(e.data) as LiveSnapshotRead;
        if (data.version >= versionRef.current) setSnap(data);
      } catch {
        /* ignore malformed frame */
      }
    };
    const onPing = () => {
      lastEventAt.current = Date.now();
      setDegraded(false);
    };
    es.addEventListener("snapshot", onSnapshot);
    es.addEventListener("ping", onPing);
    es.onerror = () => setDegraded(true); // EventSource auto-reconnects

    return () => {
      es.removeEventListener("snapshot", onSnapshot);
      es.removeEventListener("ping", onPing);
      es.close();
    };
  }, [matchId, inPlay]);

  // ---- Polling safety net ----
  useEffect(() => {
    if (!matchId || !inPlay) return;
    const tick = async () => {
      if (document.hidden) return;
      // Only poll if SSE has gone quiet — otherwise SSE has it covered.
      if (Date.now() - lastEventAt.current < FALLBACK_POLL_MS) return;
      try {
        const res = await fetch(
          `/api/matches/${matchId}/live?since=${versionRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        setDegraded(false);
        lastEventAt.current = Date.now();
        if (j.changed) {
          setSnap({
            matchId: j.matchId,
            version: j.version,
            status: j.status,
            payload: j.payload,
            updatedAt: j.updatedAt,
          });
        }
      } catch {
        setDegraded(true); // keep the last snapshot; retry next tick
      }
    };
    const interval = setInterval(tick, FALLBACK_POLL_MS);
    return () => clearInterval(interval);
  }, [matchId, inPlay]);

  return { snap, degraded };
}
