export type ScoringErrorCode =
  | "INNINGS_CLOSED"
  | "INVALID_INPUT"
  | "INVALID_DISMISSAL_ON_FREE_HIT"
  | "INVALID_DISMISSAL_ON_WIDE"
  | "INVALID_DISMISSAL_ON_NO_BALL"
  | "RETIREMENT_VIA_DELIVERY"
  | "CONSECUTIVE_OVER_BOWLER"
  | "UNKNOWN_BATTER"
  | "BATTER_NOT_AT_CREASE"
  | "BATTER_ALREADY_OUT"
  | "BATTER_ALREADY_AT_CREASE"
  | "BATTER_NOT_IN_XI";

export class ScoringError extends Error {
  readonly code: ScoringErrorCode;

  constructor(code: ScoringErrorCode, message: string) {
    super(message);
    this.name = "ScoringError";
    this.code = code;
  }
}
