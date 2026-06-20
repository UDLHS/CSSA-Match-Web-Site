import { revalidatePath, revalidateTag } from "next/cache";
import { TAG } from "@/server/cache";

/**
 * Bust the cached public data affected by an admin mutation, so edits show up
 * immediately instead of waiting for the cache TTL. We bust both the route
 * (`revalidatePath`) and the Data Cache tags behind the heavy public queries
 * (`unstable_cache`) — the latter is what actually decouples DB load from
 * viewer count. Failures are swallowed (best-effort, safe outside a request).
 */

/** Which Data Cache tags each public route depends on. */
const PATH_TAGS: Record<string, readonly string[]> = {
  [/* home */ "/"]: [TAG.matches],
  ["/matches"]: [TAG.matches],
  ["/players"]: [TAG.squads],
  ["/leaderboard"]: [TAG.leaderboard],
  ["/popular"]: [TAG.votes],
};

export function revalidatePublic(...paths: string[]): void {
  const tags = new Set<string>();
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* not in a request scope (e.g. seed) — ignore */
    }
    for (const t of PATH_TAGS[p] ?? []) tags.add(t);
  }
  bustTags(...tags);
}

/** Bust Data Cache tags directly (for data not tied to a single route). */
export function bustTags(...tags: string[]): void {
  for (const t of tags) {
    try {
      revalidateTag(t);
    } catch {
      /* not in a request scope — ignore */
    }
  }
}

export const PUBLIC_SQUADS = "/players";
export const PUBLIC_LEADERBOARD = "/leaderboard";
export const PUBLIC_POPULAR = "/popular";
export const PUBLIC_HOME = "/";
export const PUBLIC_MATCHES = "/matches";
