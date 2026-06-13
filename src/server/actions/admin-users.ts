"use server";

import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminRoleUpdateSchema,
  adminStatusUpdateSchema,
  adminUserCreateSchema,
} from "@/lib/validation/admin-users";
import { requireRole, SUPER_ADMIN_ONLY } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";

/**
 * Admin-user management (SUPER_ADMIN only). Provisions the Supabase Auth user
 * with the secret key, then mirrors it into User + AdminProfile so role checks
 * resolve. Self-lockout is prevented (can't demote/suspend your own account).
 */
export async function createAdminUser(
  raw: unknown,
): Promise<ActionResult<{ userId: string }>> {
  return runAction(async () => {
    const input = adminUserCreateSchema.parse(raw);
    const actor = await requireRole(SUPER_ADMIN_ONLY);

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new ActionError("VALIDATION", error?.message ?? "Could not create the auth user");
    }
    const userId = data.user.id;

    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: userId },
        create: { id: userId, email: input.email, name: input.name },
        update: { email: input.email, name: input.name },
      });
      await tx.adminProfile.upsert({
        where: { userId },
        create: { userId, role: input.role, status: "ACTIVE" },
        update: { role: input.role, status: "ACTIVE" },
      });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "admin.create",
        entityType: "AdminProfile",
        entityId: userId,
        after: { email: input.email, role: input.role },
      });
    });
    return { userId };
  });
}

export async function updateAdminRole(
  raw: unknown,
): Promise<ActionResult<{ userId: string }>> {
  return runAction(async () => {
    const input = adminRoleUpdateSchema.parse(raw);
    const actor = await requireRole(SUPER_ADMIN_ONLY);
    if (input.userId === actor.userId) {
      throw new ActionError("INVALID_STATE", "You can't change your own role");
    }
    const profile = await prisma.adminProfile.findUnique({ where: { userId: input.userId } });
    if (!profile) throw new ActionError("NOT_FOUND", "Admin not found");

    await prisma.$transaction(async (tx) => {
      await tx.adminProfile.update({ where: { userId: input.userId }, data: { role: input.role } });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "admin.roleChange",
        entityType: "AdminProfile",
        entityId: input.userId,
        before: { role: profile.role },
        after: { role: input.role },
      });
    });
    return { userId: input.userId };
  });
}

export async function setAdminStatus(
  raw: unknown,
): Promise<ActionResult<{ userId: string }>> {
  return runAction(async () => {
    const input = adminStatusUpdateSchema.parse(raw);
    const actor = await requireRole(SUPER_ADMIN_ONLY);
    if (input.userId === actor.userId) {
      throw new ActionError("INVALID_STATE", "You can't suspend your own account");
    }
    const profile = await prisma.adminProfile.findUnique({ where: { userId: input.userId } });
    if (!profile) throw new ActionError("NOT_FOUND", "Admin not found");

    await prisma.$transaction(async (tx) => {
      await tx.adminProfile.update({ where: { userId: input.userId }, data: { status: input.status } });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "admin.statusChange",
        entityType: "AdminProfile",
        entityId: input.userId,
        before: { status: profile.status },
        after: { status: input.status },
      });
    });
    return { userId: input.userId };
  });
}
