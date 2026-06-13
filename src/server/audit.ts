import type { Prisma } from "@prisma/client";

/** Prisma client OR open transaction — audit rows join the mutation's tx. */
export type Db = Prisma.TransactionClient;

export interface AuditEntry {
  userId: string | null;
  /** "delivery.create", "match.complete", "votes.adjust", … */
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  details?: string;
}

/**
 * Every admin mutation writes one row: who, what, before/after, when
 * (backend-spec §6). Call INSIDE the mutation's transaction so the audit
 * trail can never drift from the data.
 */
export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before === undefined ? undefined : toJson(entry.before),
      after: entry.after === undefined ? undefined : toJson(entry.after),
      details: entry.details,
    },
  });
}

/** Strips Dates/undefined so arbitrary entities serialize as stable JSON. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
