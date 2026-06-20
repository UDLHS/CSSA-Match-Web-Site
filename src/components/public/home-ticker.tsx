"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically refresh a public page's *server* data (match cards, leaderboard,
 * team standings, popular section) without touching any live-score SSE/polling
 * — those are independent code paths that update on their own.
 *
 * This only governs how fast *structural* changes appear:
 *  - new matches created in admin show up under Upcoming on their own,
 *  - a match starting/ending an innings moves it between tabs without a reload,
 *  - leaderboard/standings numbers refresh as completions land.
 *
 * Live SCORES are pushed by the per-card / hero live subscription and are
 * unaffected by this interval. With the public reads cached (`unstable_cache`)
 * and every lifecycle action busting that cache immediately on commit, each
 * tick is a Data Cache hit, not a DB query — so N viewers ticking costs ~one
 * DB read per cache window regardless of how many people are watching.
 *
 * Home and Matches pass intervalMs=4000 (status changes there should feel
 * near-instant, under 5s); Leaderboard/Players keep the relaxed default since
 * nothing there needs sub-5s freshness.
 */
export function PageTicker({ intervalMs = 12000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return; // don't burn cycles on a backgrounded tab
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
