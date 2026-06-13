import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. The pooled DATABASE_URL (PgBouncer :6543,
 * connection_limit=1) is mandatory on Vercel; the global cache prevents
 * exhausting connections during dev hot-reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
