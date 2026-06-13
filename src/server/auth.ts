import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionError } from "./errors";

/** Roles allowed to touch master data (teams/players/matches/votes/settings). */
export const MASTER_DATA_ROLES: readonly AdminRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
];

/** Roles allowed to run the scoring console (ball-by-ball mutations). */
export const SCORING_ROLES: readonly AdminRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "SCORE_UPDATER",
];

/** Only SUPER_ADMIN manages admin accounts and tournament settings. */
export const SUPER_ADMIN_ONLY: readonly AdminRole[] = ["SUPER_ADMIN"];

export interface ActorContext {
  userId: string;
  email: string;
  role: AdminRole;
}

/**
 * Authenticated Supabase user, or null. Uses `auth.getUser()` (verifies the
 * JWT against the auth server) — never trust `getSession()` alone on the server.
 */
export async function getSessionUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}

/**
 * THE server-side authz gate — called at the top of every mutation
 * (CLAUDE.md rule 4: re-check on the server, never trust the UI).
 *
 * Throws UNAUTHORIZED (401) with no session, FORBIDDEN (403) when the
 * admin profile is missing, suspended, or lacks the required role.
 */
export async function requireRole(
  allowed: readonly AdminRole[],
): Promise<ActorContext> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new ActionError("UNAUTHORIZED", "Sign in required");
  }

  const profile = await prisma.adminProfile.findUnique({
    where: { userId: sessionUser.id },
    include: { user: true },
  });
  if (!profile || profile.status !== "ACTIVE") {
    throw new ActionError("FORBIDDEN", "No active admin access");
  }
  if (!allowed.includes(profile.role)) {
    throw new ActionError(
      "FORBIDDEN",
      `Requires role: ${allowed.join(" or ")}`,
    );
  }

  // Fire-and-forget activity stamp — never blocks or fails the mutation.
  prisma.adminProfile
    .update({
      where: { id: profile.id },
      data: { lastActiveAt: new Date() },
    })
    .catch(() => {});

  return {
    userId: profile.userId,
    email: profile.user.email,
    role: profile.role,
  };
}
