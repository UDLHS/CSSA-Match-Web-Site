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
 *  - a match starting moves Upcoming → Live without a manual reload,
 *  - leaderboard/standings numbers refresh as completions land.
 *
 * Live SCORES are pushed by the per-card / hero live subscription and are
 * unaffected by this interval — so we keep it relaxed. With the public reads
 * cached (`unstable_cache`), each refresh is a Data Cache hit, not a DB query,
 * so N viewers refreshing costs ~one DB read per cache window regardless of
 * how many people are watching.
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
