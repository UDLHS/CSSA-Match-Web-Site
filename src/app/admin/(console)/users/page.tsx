import { prisma } from "@/lib/db";
import { requirePageRole } from "@/server/admin-guard";
import { SUPER_ADMIN_ONLY } from "@/server/auth";
import { UsersScreen } from "@/components/admin/users/users-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin users — Fiesta Admin" };

export default async function AdminUsersPage() {
  const actor = await requirePageRole(SUPER_ADMIN_ONLY);

  const profiles = await prisma.adminProfile.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <UsersScreen
      selfId={actor.userId}
      users={profiles.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        role: p.role,
        status: p.status,
        lastActiveAt: p.lastActiveAt?.toISOString() ?? null,
      }))}
    />
  );
}
