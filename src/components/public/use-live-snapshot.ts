"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveSnapshotRead } from "@/lib/live-types";

const POLL_MS = 3_000;

/**
 * Live snapshot subscription (backend-spec §7 read model).
 *
 * Transport is **short polling** against `/api/matches/:id/live?since=<v>`,
 * which reads the denormalized snapshot row (cached ~2s, so N concurrent
 * viewers collapse into ~one DB read per window). We deliberately do NOT hold
 * an SSE connection open per viewer: on serverless each open stream pins a
 * function instance for its whole lifetime, so a few hundred viewers across a
 * multi-hour match would burn hundreds of function-hours. A 5s poll is a tiny
 * request (`{changed:false}` when the version is unchanged) and scales to
 * hundreds/thousands of viewers cheaply — latency stays well under a ball.
 */
export function useLiveSnapshot(initial: LiveSnapshotRead | null) {
  const [snap, setSnap] = useState(initial);
  const [degraded, setDegraded] = useState(false);

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

  useEffect(() => {
    if (!matchId || !inPlay) return;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return; // backgrounded tabs don't poll
      try {
        const res = await fetch(
          `/api/matches/${matchId}/live?since=${versionRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(String(res.status));
        const j = await res.json();
        if (cancelled) return;
        setDegraded(false);
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
        if (!cancelled) setDegraded(true); // keep last snapshot; retry next tick
      }
    };

    tick(); // immediate first poll so a freshly-live card catches up fast
    const interval = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId, inPlay]);

  return { snap, degraded };
}
