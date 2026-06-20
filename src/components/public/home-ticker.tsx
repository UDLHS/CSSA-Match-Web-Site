"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically refresh the home page's *server* data (matches carousel,
 * leaderboard preview, popular section) without touching the live-hero
 * SSE stream — they're independent code paths.
 *
 * This only governs how fast *structural* changes appear:
 *  - new matches created in admin show up under Upcoming on their own,
 *  - a match starting moves Upcoming → Live without a manual reload,
 *  - leaderboard numbers refresh as completions land.
 *
 * Live SCORES are pushed by the per-card / hero live subscription and are
 * unaffected by this interval — so we keep it relaxed. With the public reads
 * cached (`unstable_cache`), each refresh is a Data Cache hit, not a DB query,
 * so N viewers refreshing costs ~one DB read per cache window regardless of
 * how many people are watching.
 */
export function HomeTicker({ intervalMs = 12000 }: { intervalMs?: number }) {
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
