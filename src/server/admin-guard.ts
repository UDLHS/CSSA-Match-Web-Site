import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser, type ActorContext } from "@/server/auth";

/**
 * Page-level guard for admin RSC pages. Mirrors `requireRole` (used by
 * mutations) but redirects instead of throwing, so the UI degrades cleanly:
 *   - no session        → /admin/login
 *   - no/!active profile → /admin/forbidden
 *   - wrong role         → /admin/forbidden
 */
export async function requirePageRole(
  allowed: readonly AdminRole[],
): Promise<ActorContext> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/admin/login");

  const profile = await prisma.adminProfile.findUnique({
    where: { userId: sessionUser.id },
    include: { user: true },
  });
  if (!profile || profile.status !== "ACTIVE") redirect("/admin/forbidden");
  if (!allowed.includes(profile.role)) redirect("/admin/forbidden");

  return {
    userId: profile.userId,
    email: profile.user.email,
    role: profile.role,
  };
}
