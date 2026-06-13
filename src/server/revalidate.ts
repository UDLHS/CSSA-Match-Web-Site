import { revalidatePath } from "next/cache";

/**
 * Bust the cached public pages affected by an admin mutation, so edits show
 * up immediately instead of waiting for the ISR window. Safe to call from any
 * server action; failures are swallowed (cache busting is best-effort).
 */
export function revalidatePublic(...paths: string[]): void {
  for (const p of paths) {
    try {
      revalidatePath(p);
    } catch {
      /* not in a request scope (e.g. seed) — ignore */
    }
  }
}

export const PUBLIC_SQUADS = "/players";
export const PUBLIC_LEADERBOARD = "/leaderboard";
export const PUBLIC_POPULAR = "/popular";
export const PUBLIC_HOME = "/";
export const PUBLIC_MATCHES = "/matches";
