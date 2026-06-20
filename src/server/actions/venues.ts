"use server";

import { prisma } from "@/lib/db";
import { venueCreateSchema, venueUpdateSchema } from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { revalidatePublic, PUBLIC_HOME, PUBLIC_MATCHES } from "@/server/revalidate";

export async function createVenue(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = venueCreateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const venue = await prisma.$transaction(async (tx) => {
      const created = await tx.venue.create({ data: input });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "venue.create",
        entityType: "Venue",
        entityId: created.id,
        after: input,
      });
      return created;
    });
    return { id: venue.id };
  });
}

export async function updateVenue(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { id, ...data } = venueUpdateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const before = await prisma.venue.findUnique({ where: { id } });
    if (!before) throw new ActionError("NOT_FOUND", "Venue not found");

    await prisma.$transaction(async (tx) => {
      await tx.venue.update({ where: { id }, data });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "venue.update",
        entityType: "Venue",
        entityId: id,
        before,
        after: data,
      });
    });
    return { id };
  });
}

/**
 * Venue has no deletedAt column (it's simple reference data, not history a
 * scorecard depends on) — this is a real delete. Matches/teams that
 * reference this venue have it nulled out automatically (onDelete: SetNull),
 * never a foreign-key error. Blocked while an upcoming/live match still
 * uses it so a fixture's venue doesn't silently disappear underneath it.
 */
export async function deleteVenue(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);

    const venue = await prisma.venue.findUnique({ where: { id } });
    if (!venue) throw new ActionError("NOT_FOUND", "Venue not found");

    const active = await prisma.match.count({
      where: {
        venueId: id,
        deletedAt: null,
        status: { in: ["UPCOMING", "LIVE", "INNINGS_BREAK"] },
      },
    });
    if (active > 0) {
      throw new ActionError(
        "INVALID_STATE",
        "Venue has upcoming or live matches assigned — reassign those fixtures first",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.venue.delete({ where: { id } });
      await writeAudit(tx, {
        userId: actor.userId,
        action: "venue.delete",
        entityType: "Venue",
        entityId: id,
        before: venue,
      });
    });
    revalidatePublic(PUBLIC_HOME, PUBLIC_MATCHES);
    return { id };
  });
}
