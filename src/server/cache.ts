/**
 * Shared cache tags for the public read layer.
 *
 * Public queries are wrapped in `unstable_cache` so N concurrent viewers cost
 * roughly the same as one — the database is hit at most once per TTL (or until
 * a tag is busted), not once per viewer. Admin mutations call
 * `revalidateTag(...)` so their changes appear immediately.
 *
 * Live match data uses a short TTL only (a couple of seconds) — enough to
 * collapse a live match's many SSE/poll reads into ~one DB hit, while staying
 * effectively real-time for cricket.
 */
export const TAG = {
  matches: "pub:matches", // match list / cards / featured pick (structural)
  leaderboard: "pub:leaderboard",
  votes: "pub:votes",
  squads: "pub:squads",
  sponsors: "pub:sponsors",
  standings: "pub:standings", // team points table (manual points + derived W/L)
} as const;

export const TTL = {
  /** Live snapshot reads — short enough to feel real-time, long enough to dedup. */
  live: 2,
  /** Home match lists — self-corrected by the per-card live subscription. */
  matchList: 5,
  /** Slow-changing data — instant on admin change via tag, else served from cache. */
  slow: 30,
  squads: 60,
} as const;
