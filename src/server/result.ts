import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ScoringError } from "@/lib/scoring";
import { ActionError, type ActionErrorCode } from "./errors";

/** Discriminated result every server action returns — UI never sees throws. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ActionErrorCode; message: string; details?: unknown };
    };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  code: ActionErrorCode,
  message: string,
  details?: unknown,
): ActionResult<T> {
  return { ok: false, error: { code, message, details } };
}

/**
 * Wraps an action body, mapping known error types onto the typed result.
 * Unknown errors are logged server-side and returned as opaque INTERNAL.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof ActionError) {
      return fail(err.code, err.message, err.details);
    }
    if (err instanceof ScoringError) {
      return fail("SCORING", err.message, { scoringCode: err.code });
    }
    if (err instanceof ZodError) {
      return fail("VALIDATION", "Invalid input", err.flatten());
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // (inningsId, sequence) or idempotencyKey race — someone wrote first.
      return fail(
        "CONFLICT",
        "A concurrent write beat this one — refresh and retry",
        { target: err.meta?.target },
      );
    }
    console.error("[action] unexpected error:", err);
    return fail("INTERNAL", "Something went wrong");
  }
}
