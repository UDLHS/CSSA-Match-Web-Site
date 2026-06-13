/**
 * Typed failures for server actions / route handlers.
 * UNAUTHORIZED → 401 (no session) · FORBIDDEN → 403 (role/permission)
 * per backend-spec §1.
 */
export type ActionErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT" // optimistic-concurrency / unique-constraint clash
  | "IDEMPOTENT_REPLAY" // duplicate idempotencyKey (double-tap) — not an error for the client
  | "SCORING" // rejected by the scoring engine (with its code in details)
  | "INVALID_STATE" // e.g. scoring a match that is not LIVE
  | "INTERNAL";

export class ActionError extends Error {
  readonly code: ActionErrorCode;
  readonly details?: unknown;

  constructor(code: ActionErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ActionError";
    this.code = code;
    this.details = details;
  }
}

export const httpStatusFor: Record<ActionErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  IDEMPOTENT_REPLAY: 409,
  SCORING: 422,
  INVALID_STATE: 409,
  INTERNAL: 500,
};
