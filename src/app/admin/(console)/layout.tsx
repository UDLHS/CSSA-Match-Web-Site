import { prisma } from "@/lib/db";
import { requirePageRole } from "@/server/admin-guard";
import { SCORING_ROLES } from "@/server/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

/** Gates the whole console (any active admin role) and renders the shell. */
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requirePageRole(SCORING_ROLES);

  const [user, liveCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actor.userId },
      select: { name: true },
    }),
    prisma.match.count({
      where: { deletedAt: null, status: { in: ["LIVE", "INNINGS_BREAK"] } },
    }),
  ]);

  return (
    <AdminShell
      role={actor.role}
      name={user?.name ?? actor.email}
      email={actor.email}
      liveActive={liveCount > 0}
    >
      {children}
    </AdminShell>
  );
}
