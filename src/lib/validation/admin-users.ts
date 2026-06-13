import { z } from "zod";
import { text } from "./common";

export const adminRoleSchema = z.enum(["SUPER_ADMIN", "ADMIN", "SCORE_UPDATER"]);
export const adminStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

export const adminUserCreateSchema = z.object({
  email: z.string().email().max(160),
  name: text(2, 80),
  password: z.string().min(8).max(72),
  role: adminRoleSchema,
});

export const adminRoleUpdateSchema = z.object({
  userId: z.string().uuid(),
  role: adminRoleSchema,
});

export const adminStatusUpdateSchema = z.object({
  userId: z.string().uuid(),
  status: adminStatusSchema,
});

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
