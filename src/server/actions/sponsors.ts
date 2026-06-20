"use server";

import { prisma } from "@/lib/db";
import {
  adCreateSchema,
  adUpdateSchema,
  sponsorCreateSchema,
  sponsorUpdateSchema,
} from "@/lib/validation";
import { idSchema } from "@/lib/validation/common";
import { requireRole, MASTER_DATA_ROLES } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { ActionError } from "@/server/errors";
import { runAction, type ActionResult } from "@/server/result";
import { bustTags } from "@/server/revalidate";
import { TAG } from "@/server/cache";

// ---- Sponsors ----------------------------------------------------------

export async function createSponsor(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = sponsorCreateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const sponsor = await prisma.$transaction(async (tx) => {
      const created = await tx.sponsor.create({ data: input });
      await writeAudit(tx, { userId: actor.userId, action: "sponsor.create", entityType: "Sponsor", entityId: created.id, after: input });
      return created;
    });
    bustTags(TAG.sponsors);
    return { id: sponsor.id };
  });
}

export async function updateSponsor(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { id, ...data } = sponsorUpdateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const before = await prisma.sponsor.findUnique({ where: { id } });
    if (!before) throw new ActionError("NOT_FOUND", "Sponsor not found");
    await prisma.$transaction(async (tx) => {
      await tx.sponsor.update({ where: { id }, data });
      await writeAudit(tx, { userId: actor.userId, action: "sponsor.update", entityType: "Sponsor", entityId: id, before, after: data });
    });
    bustTags(TAG.sponsors);
    return { id };
  });
}

export async function deleteSponsor(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const sponsor = await prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new ActionError("NOT_FOUND", "Sponsor not found");
    await prisma.$transaction(async (tx) => {
      // AdCreatives cascade on delete (FK onDelete: Cascade).
      await tx.sponsor.delete({ where: { id } });
      await writeAudit(tx, { userId: actor.userId, action: "sponsor.delete", entityType: "Sponsor", entityId: id, before: sponsor });
    });
    bustTags(TAG.sponsors);
    return { id };
  });
}

// ---- Ad creatives ------------------------------------------------------

export async function createAd(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const input = adCreateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const sponsor = await prisma.sponsor.findUnique({ where: { id: input.sponsorId } });
    if (!sponsor) throw new ActionError("VALIDATION", "Sponsor not found");
    const ad = await prisma.$transaction(async (tx) => {
      const created = await tx.adCreative.create({ data: input });
      await writeAudit(tx, { userId: actor.userId, action: "ad.create", entityType: "AdCreative", entityId: created.id, after: input });
      return created;
    });
    bustTags(TAG.sponsors);
    return { id: ad.id };
  });
}

export async function updateAd(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { id, ...data } = adUpdateSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const before = await prisma.adCreative.findUnique({ where: { id } });
    if (!before) throw new ActionError("NOT_FOUND", "Ad not found");
    await prisma.$transaction(async (tx) => {
      await tx.adCreative.update({ where: { id }, data });
      await writeAudit(tx, { userId: actor.userId, action: "ad.update", entityType: "AdCreative", entityId: id, before, after: data });
    });
    bustTags(TAG.sponsors);
    return { id };
  });
}

export async function toggleAd(raw: unknown): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const ad = await prisma.adCreative.findUnique({ where: { id } });
    if (!ad) throw new ActionError("NOT_FOUND", "Ad not found");
    const next = !ad.isActive;
    await prisma.$transaction(async (tx) => {
      await tx.adCreative.update({ where: { id }, data: { isActive: next } });
      await writeAudit(tx, { userId: actor.userId, action: "ad.toggle", entityType: "AdCreative", entityId: id, after: { isActive: next } });
    });
    bustTags(TAG.sponsors);
    return { id, isActive: next };
  });
}

export async function deleteAd(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = idSchema.parse(raw);
    const actor = await requireRole(MASTER_DATA_ROLES);
    const ad = await prisma.adCreative.findUnique({ where: { id } });
    if (!ad) throw new ActionError("NOT_FOUND", "Ad not found");
    await prisma.$transaction(async (tx) => {
      await tx.adCreative.delete({ where: { id } });
      await writeAudit(tx, { userId: actor.userId, action: "ad.delete", entityType: "AdCreative", entityId: id, before: ad });
    });
    bustTags(TAG.sponsors);
    return { id };
  });
}
