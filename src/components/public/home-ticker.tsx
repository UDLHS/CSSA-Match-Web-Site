"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically refresh the home page's *server* data (matches carousel,
 * leaderboard preview, popular section) without touching the live-hero
 * SSE stream — they're independent code paths.
 *
 * One ~8s router.refresh() is cheap (Mumbai-local query) and means:
 *  - new matches created in admin show up under Upcoming on their own,
 *  - a match starting moves Upcoming → Live without a manual reload,
 *  - leaderboard numbers refresh as completions land.
 */
export function HomeTicker({ intervalMs = 4000 }: { intervalMs?: number }) {
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
