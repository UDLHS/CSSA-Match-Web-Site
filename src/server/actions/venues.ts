"use server";

import { prisma } from "@/lib/db";
import { venueCreateSchema, venueUpdateSchema } from "@/lib/validation";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";

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
