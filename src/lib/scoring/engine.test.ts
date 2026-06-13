/**
 * Scoring-engine contract tests — one explicit test (at least) per edge case
 * in backend-spec §3. These tests ARE the definition of done for the engine.
 *
 * Players: A (opening striker), B (opening non-striker), C/D/E… incoming.
 * Bowlers: X and Y alternate overs.
 */

import { describe, expect, it } from "vitest";
import {
  applyEvent,
  ballLabel,
  createInnings,
  editEvent,
  getInningsSummary,
  replayInnings,
  undoLastEvent,
} from "./engine";
import { ScoringError } from "./errors";
import type {
  DeliveryEvent,
  InningsConfig,
  InningsEvent,
  InningsState,
} from "./types";

const cfg = (over: Partial<InningsConfig> = {}): InningsConfig => ({
  inningsNumber: 1,
  oversLimit: 20,
  ballsPerOver: 6,
  battersPerSide: 11,
  openingStrikerId: "A",
  openingNonStrikerId: "B",
  ...over,
});

const ball = (over: Partial<DeliveryEvent> = {}): DeliveryEvent => ({
  kind: "delivery",
  bowlerId: "X",
  runsOffBat: 0,
  ...over,
});

const dots = (n: number, bowlerId = "X"): DeliveryEvent[] =>
  Array.from({ length: n }, () => ball({ bowlerId }));

function expectScoringError(
  fn: () => unknown,
  code: ScoringError["code"],
): void {
  try {
    fn();
    expect.fail(`expected ScoringError ${code}, nothing was thrown`);
  } catch (e) {
    expect(e).toBeInstanceOf(ScoringError);
    expect((e as ScoringError).code).toBe(code);
  }
}

// ----------------------------------------------------------------
// §3.1 — last legal ball of the over with odd runs preserves striker
// (two INDEPENDENT toggles, never one boolean)
// ----------------------------------------------------------------

describe("§3.1 strike rotation — two independent toggles", () => {
  it("odd runs mid-over rotate strike", () => {
    const s = replayInnings(cfg(), [ball({ runsOffBat: 1 })]);
    expect(s.strikerId).toBe("B");
    expect(s.nonStrikerId).toBe("A");
  });

  it("even runs mid-over keep the striker", () => {
    const s = replayInnings(cfg(), [ball({ runsOffBat: 2 })]);
    expect(s.strikerId).toBe("A");
  });

  it("THE bug case: single off the last legal ball of the over → striker is PRESERVED (toggles cancel)", () => {
    const events = [...dots(5), ball({ runsOffBat: 1 })];
    const s = replayInnings(cfg(), events);
    expect(s.legalBalls).toBe(6); // over complete
    expect(s.strikerId).toBe("A"); // odd-run swap + over swap cancelled out
    expect(s.nonStrikerId).toBe("B");
  });

  it("dot on the last ball of the over → ends swap (over toggle only)", () => {
    const s = replayInnings(cfg(), dots(6));
    expect(s.strikerId).toBe("B");
    expect(s.nonStrikerId).toBe("A");
  });

  it("boundary 4 off the last ball (no runs ran) → ends swap (over toggle only)", () => {
    const s = replayInnings(cfg(), [...dots(5), ball({ runsOffBat: 4 })]);
    expect(s.strikerId).toBe("B");
  });

  it("all-run 3 (not a boundary) rotates strike like any odd runs", () => {
    const s = replayInnings(cfg(), [ball({ runsOffBat: 3 })]);
    expect(s.strikerId).toBe("B");
  });
});

// ----------------------------------------------------------------
// §3.2 — free hit
// ----------------------------------------------------------------

describe("§3.2 free hit", () => {
  it("a no-ball arms the free hit; the next delivery is marked isFreeHit", () => {
    let s = createInnings(cfg());
    s = applyEvent(s, ball({ extraType: "NO_BALL", extraRuns: 1 }));
    expect(s.freeHitPending).toBe(true);
    s = applyEvent(s, ball({ runsOffBat: 4 }));
    expect(s.deliveries[1].isFreeHit).toBe(true);
    expect(s.freeHitPending).toBe(false); // consumed by the legal ball
  });

  it("bowled/caught/LBW/stumped cannot dismiss on a free hit", () => {
    const armed = [ball({ extraType: "NO_BALL", extraRuns: 1 })];
    for (const type of ["BOWLED", "CAUGHT", "LBW", "STUMPED"] as const) {
      expectScoringError(
        () =>
          replayInnings(cfg(), [
            ...armed,
            ball({ wicket: { type, dismissedPlayerId: "A" }, newBatterId: "C" }),
          ]),
        "INVALID_DISMISSAL_ON_FREE_HIT",
      );
    }
  });

  it("run-out IS possible on a free hit", () => {
    const s = replayInnings(cfg(), [
      ball({ extraType: "NO_BALL", extraRuns: 1 }),
      ball({
        runsOffBat: 1,
        wicket: { type: "RUN_OUT", dismissedPlayerId: "A", battersCrossed: false },
        newBatterId: "C",
      }),
    ]);
    expect(s.wickets).toBe(1);
    expect(s.deliveries[1].isFreeHit).toBe(true);
  });

  it("the free hit carries forward through a wide (another illegal delivery)", () => {
    let s = createInnings(cfg());
    s = applyEvent(s, ball({ extraType: "NO_BALL", extraRuns: 1 }));
    s = applyEvent(s, ball({ extraType: "WIDE", extraRuns: 1 }));
    expect(s.freeHitPending).toBe(true); // still armed
    s = applyEvent(s, ball({}));
    expect(s.deliveries[2].isFreeHit).toBe(true);
    expect(s.freeHitPending).toBe(false);
  });

  it("a no-ball on a free hit re-arms it", () => {
    let s = createInnings(cfg());
    s = applyEvent(s, ball({ extraType: "NO_BALL", extraRuns: 1 }));
    s = applyEvent(s, ball({ extraType: "NO_BALL", extraRuns: 1 }));
    expect(s.freeHitPending).toBe(true);
  });

  it("a wide with no free hit armed does NOT arm one", () => {
    const s = replayInnings(cfg(), [ball({ extraType: "WIDE", extraRuns: 1 })]);
    expect(s.freeHitPending).toBe(false);
  });
});

// ----------------------------------------------------------------
// §3.3 — wicket on an illegal delivery
// ----------------------------------------------------------------

describe("§3.3 wicket on an illegal delivery", () => {
  it("run-out on a wide records BOTH the extra runs and the wicket on one delivery", () => {
    const s = replayInnings(cfg(), [
      ball({
        extraType: "WIDE",
        extraRuns: 2, // wide + 1 run attempted
        wicket: { type: "RUN_OUT", dismissedPlayerId: "B", battersCrossed: false },
        newBatterId: "C",
      }),
    ]);
    expect(s.totalRuns).toBe(2);
    expect(s.extras.wides).toBe(2);
    expect(s.wickets).toBe(1);
    expect(s.legalBalls).toBe(0); // a wide is still not a legal ball
    expect(s.deliveries[0].wicket?.type).toBe("RUN_OUT");
  });

  it("stumping IS legal off a wide (no bowler change of rules)", () => {
    const s = replayInnings(cfg(), [
      ball({
        extraType: "WIDE",
        extraRuns: 1,
        wicket: { type: "STUMPED", dismissedPlayerId: "A", fielderId: "WK" },
        newBatterId: "C",
      }),
    ]);
    expect(s.wickets).toBe(1);
    expect(s.bowlers["X"].wickets).toBe(1); // stumping credits the bowler
  });

  it("stumping is NOT possible off a no-ball", () => {
    expectScoringError(
      () =>
        replayInnings(cfg(), [
          ball({
            extraType: "NO_BALL",
            extraRuns: 1,
            wicket: { type: "STUMPED", dismissedPlayerId: "A" },
            newBatterId: "C",
          }),
        ]),
      "INVALID_DISMISSAL_ON_NO_BALL",
    );
  });

  it("bowled is NOT possible off a wide", () => {
    expectScoringError(
      () =>
        replayInnings(cfg(), [
          ball({
            extraType: "WIDE",
            extraRuns: 1,
            wicket: { type: "BOWLED", dismissedPlayerId: "A" },
            newBatterId: "C",
          }),
        ]),
      "INVALID_DISMISSAL_ON_WIDE",
    );
  });
});

// ----------------------------------------------------------------
// §3.4 — byes / leg-byes are LEGAL deliveries
// ----------------------------------------------------------------

describe("§3.4 byes & leg-byes", () => {
  it("a bye advances the ball count, rotates strike on odd runs, and is NOT charged to batter or bowler", () => {
    const s = replayInnings(cfg(), [ball({ extraType: "BYE", extraRuns: 1 })]);
    expect(s.legalBalls).toBe(1); // legal delivery
    expect(s.totalRuns).toBe(1);
    expect(s.extras.byes).toBe(1);
    expect(s.batters["A"].runs).toBe(0); // not the batsman's
    expect(s.batters["A"].ballsFaced).toBe(1); // but he faced it
    expect(s.bowlers["X"].runsConceded).toBe(0); // not the bowler's
    expect(s.strikerId).toBe("B"); // odd runs rotated strike
  });

  it("two leg-byes count as extras and keep the striker (even runs)", () => {
    const s = replayInnings(cfg(), [ball({ extraType: "LEG_BYE", extraRuns: 2 })]);
    expect(s.extras.legByes).toBe(2);
    expect(s.totalRuns).toBe(2);
    expect(s.strikerId).toBe("A");
    expect(s.bowlers["X"].runsConceded).toBe(0);
  });

  it("an over of byes still counts as a maiden for the bowler", () => {
    const s = replayInnings(cfg(), [
      ...dots(5),
      ball({ extraType: "BYE", extraRuns: 2 }),
    ]);
    expect(s.bowlers["X"].maidens).toBe(1);
  });
});

// ----------------------------------------------------------------
// §3.5 — retired hurt vs retired out
// ----------------------------------------------------------------

describe("§3.5 retirements", () => {
  it("retired hurt is NOT a dismissal: no wicket, no FoW, no bowler credit — and the batter can resume", () => {
    let s = replayInnings(cfg(), [ball({ runsOffBat: 4 })]);
    s = applyEvent(s, {
      kind: "retirement",
      playerId: "A",
      type: "RETIRED_HURT",
      newBatterId: "C",
    });
    expect(s.wickets).toBe(0);
    expect(s.fallOfWickets).toHaveLength(0);
    expect(s.batters["A"].status).toBe("RETIRED_HURT");
    expect(s.strikerId).toBe("C"); // replaces at the vacated end

    // C is dismissed → A resumes and keeps batting on 4*
    s = applyEvent(
      s,
      ball({
        wicket: { type: "BOWLED", dismissedPlayerId: "C" },
        newBatterId: "A",
      }),
    );
    expect(s.batters["A"].status).toBe("NOT_OUT");
    s = applyEvent(s, ball({ runsOffBat: 4 }));
    expect(s.batters["A"].runs).toBe(8); // 4 before retiring + 4 after resuming
  });

  it("retired out IS a dismissal: wicket counted, FoW entry, no bowler credit", () => {
    let s = createInnings(cfg());
    s = applyEvent(s, {
      kind: "retirement",
      playerId: "A",
      type: "RETIRED_OUT",
      newBatterId: "C",
    });
    expect(s.wickets).toBe(1);
    expect(s.fallOfWickets).toHaveLength(1);
    expect(s.fallOfWickets[0].type).toBe("RETIRED_OUT");
    expect(s.fallOfWickets[0].bowlerId).toBeNull();
    expect(s.batters["A"].status).toBe("RETIRED_OUT");
  });

  it("a retirement cannot be recorded as a delivery wicket", () => {
    expectScoringError(
      () =>
        replayInnings(cfg(), [
          ball({
            wicket: { type: "RETIRED_HURT", dismissedPlayerId: "A" },
            newBatterId: "C",
          }),
        ]),
      "RETIREMENT_VIA_DELIVERY",
    );
  });

  it("a previously dismissed batter cannot come back", () => {
    const events: InningsEvent[] = [
      ball({ wicket: { type: "BOWLED", dismissedPlayerId: "A" }, newBatterId: "C" }),
      ball({ wicket: { type: "BOWLED", dismissedPlayerId: "C" }, newBatterId: "A" }),
    ];
    expectScoringError(() => replayInnings(cfg(), events), "BATTER_ALREADY_OUT");
  });
});

// ----------------------------------------------------------------
// §3.6 — penalty runs without a delivery
// ----------------------------------------------------------------

describe("§3.6 penalty runs", () => {
  it("5 penalty runs add to the total without a ball bowled, strike unchanged", () => {
    let s = createInnings(cfg());
    s = applyEvent(s, { kind: "penalty", runs: 5, reason: "ball tampering" });
    expect(s.totalRuns).toBe(5);
    expect(s.extras.penalties).toBe(5);
    expect(s.legalBalls).toBe(0);
    expect(s.deliveries).toHaveLength(0);
    expect(s.strikerId).toBe("A");
  });

  it("penalty runs can win a chase (target reached without a ball)", () => {
    let s = createInnings(cfg({ inningsNumber: 2, target: 3 }));
    s = applyEvent(s, { kind: "penalty", runs: 5 });
    expect(s.status).toBe("COMPLETED");
    expect(s.closeReason).toBe("TARGET_REACHED");
  });
});

// ----------------------------------------------------------------
// §3.7 — run-out: new batter at the end where the wicket fell;
// next striker from runs completed + crossed flag
// ----------------------------------------------------------------

describe("§3.7 run-out end resolution", () => {
  it("1 completed run + crossed on the attempt: non-striker out at the non-striker end", () => {
    // A & B complete 1 (A→non-striker end, B→striker end); attempting the
    // 2nd they cross again (A back to striker end); B is run out short.
    const s = replayInnings(cfg(), [
      ball({
        runsOffBat: 1,
        wicket: { type: "RUN_OUT", dismissedPlayerId: "B", battersCrossed: true },
        newBatterId: "C",
      }),
    ]);
    expect(s.fallOfWickets[0].endWhereOut).toBe("NON_STRIKER_END");
    expect(s.strikerId).toBe("A"); // resolved from 1 completed run + crossed
    expect(s.nonStrikerId).toBe("C"); // new batter at the end where it fell
    expect(s.totalRuns).toBe(1); // the completed run counts
  });

  it("0 completed runs, not crossed: striker out at the striker end, new batter on strike", () => {
    const s = replayInnings(cfg(), [
      ball({
        wicket: { type: "RUN_OUT", dismissedPlayerId: "A", battersCrossed: false },
        newBatterId: "C",
      }),
    ]);
    expect(s.fallOfWickets[0].endWhereOut).toBe("STRIKER_END");
    expect(s.strikerId).toBe("C");
    expect(s.nonStrikerId).toBe("B");
  });

  it("caught with batters crossed: surviving batter keeps the striker end", () => {
    const s = replayInnings(cfg(), [
      ball({
        wicket: {
          type: "CAUGHT",
          dismissedPlayerId: "A",
          fielderId: "F",
          battersCrossed: true,
        },
        newBatterId: "C",
      }),
    ]);
    expect(s.strikerId).toBe("B"); // crossed before the catch
    expect(s.nonStrikerId).toBe("C");
  });

  it("run-out on the last ball of the over: end-of-over swap still applies after replacement", () => {
    const s = replayInnings(cfg(), [
      ...dots(5),
      ball({
        wicket: { type: "RUN_OUT", dismissedPlayerId: "A", battersCrossed: false },
        newBatterId: "C",
      }),
    ]);
    // C replaced A at the striker end, then the over ended → ends swap.
    expect(s.strikerId).toBe("B");
    expect(s.nonStrikerId).toBe("C");
  });
});

// ----------------------------------------------------------------
// §3.8 — innings end conditions
// ----------------------------------------------------------------

describe("§3.8 innings end", () => {
  it("target reached MID-OVER ends the innings immediately — no further balls", () => {
    let s = createInnings(cfg({ inningsNumber: 2, target: 5 }));
    s = applyEvent(s, ball({ runsOffBat: 6 }));
    expect(s.status).toBe("COMPLETED");
    expect(s.closeReason).toBe("TARGET_REACHED");
    expect(s.legalBalls).toBe(1); // mid-over
    expectScoringError(() => applyEvent(s, ball({})), "INNINGS_CLOSED");
  });

  it("target can be reached by a wide (extras win the chase)", () => {
    let s = createInnings(cfg({ inningsNumber: 2, target: 1 }));
    s = applyEvent(s, ball({ extraType: "WIDE", extraRuns: 1 }));
    expect(s.status).toBe("COMPLETED");
    expect(s.closeReason).toBe("TARGET_REACHED");
  });

  it("all out at battersPerSide − 1 wickets", () => {
    const s = replayInnings(cfg({ battersPerSide: 3 }), [
      ball({ wicket: { type: "BOWLED", dismissedPlayerId: "A" }, newBatterId: "C" }),
      ball({ wicket: { type: "BOWLED", dismissedPlayerId: "C" } }), // 2nd wicket = all out
    ]);
    expect(s.status).toBe("COMPLETED");
    expect(s.closeReason).toBe("ALL_OUT");
    expect(s.wickets).toBe(2);
  });

  it("a wicket with no replacement available closes the innings ALL_OUT", () => {
    const s = replayInnings(cfg(), [
      ball({ wicket: { type: "BOWLED", dismissedPlayerId: "A" } }), // no newBatterId
    ]);
    expect(s.status).toBe("COMPLETED");
    expect(s.closeReason).toBe("ALL_OUT");
  });

  it("overs complete closes the innings", () => {
    const s = replayInnings(cfg({ oversLimit: 1 }), dots(6));
    expect(s.status).toBe("COMPLETED");
    expect(s.closeReason).toBe("OVERS_COMPLETE");
    expectScoringError(() => applyEvent(s, ball({ bowlerId: "Y" })), "INNINGS_CLOSED");
  });

  it("wides do NOT advance the over count toward completion", () => {
    const s = replayInnings(cfg({ oversLimit: 1 }), [
      ...dots(5),
      ball({ extraType: "WIDE", extraRuns: 1 }),
    ]);
    expect(s.status).toBe("IN_PROGRESS");
    expect(s.legalBalls).toBe(5);
  });
});

// ----------------------------------------------------------------
// Base calculations & numbering (backend-spec §3 "base calculations")
// ----------------------------------------------------------------

describe("base calculations", () => {
  it("total = bat runs + all extras; bowler charged bat + wide/no-ball only", () => {
    const s = replayInnings(cfg(), [
      ball({ runsOffBat: 4 }),
      ball({ extraType: "WIDE", extraRuns: 1 }),
      ball({ extraType: "NO_BALL", extraRuns: 1, runsOffBat: 4 }),
      ball({ extraType: "LEG_BYE", extraRuns: 1 }),
    ]);
    expect(s.totalRuns).toBe(4 + 1 + 5 + 1);
    expect(s.bowlers["X"].runsConceded).toBe(4 + 1 + 5); // leg-bye not charged
    expect(s.batters["A"].runs).toBe(8); // off the bat only
    expect(s.extras).toEqual({ wides: 1, noBalls: 1, byes: 0, legByes: 1, penalties: 0 });
  });

  it("runs RAN on a wide rotate the strike (the penalty run is not run)", () => {
    // WD + 1 ran = 2 wide extras; the single ran swaps ends
    const s = replayInnings(cfg(), [ball({ extraType: "WIDE", extraRuns: 2 })]);
    expect(s.totalRuns).toBe(2);
    expect(s.extras.wides).toBe(2);
    expect(s.strikerId).toBe("B");
  });

  it("a no-ball counts as a ball faced by the striker; a wide does not", () => {
    const s = replayInnings(cfg(), [
      ball({ extraType: "NO_BALL", extraRuns: 1 }),
      ball({ extraType: "WIDE", extraRuns: 1 }),
    ]);
    expect(s.batters["A"].ballsFaced).toBe(1);
  });

  it("illegal deliveries repeat the upcoming ball number (wide at 0.1 then legal 0.1)", () => {
    const s = replayInnings(cfg(), [
      ball({ extraType: "WIDE", extraRuns: 1 }),
      ball({ runsOffBat: 1 }),
    ]);
    expect(s.deliveries[0].overBall).toBe("0.1");
    expect(s.deliveries[1].overBall).toBe("0.1");
    expect(s.legalBalls).toBe(1);
  });

  it("a bowler cannot bowl two consecutive overs", () => {
    expectScoringError(
      () => replayInnings(cfg(), [...dots(6, "X"), ball({ bowlerId: "X" })]),
      "CONSECUTIVE_OVER_BOWLER",
    );
    // …but a different bowler is fine
    const s = replayInnings(cfg(), [...dots(6, "X"), ball({ bowlerId: "Y" })]);
    expect(s.bowlers["Y"].legalBalls).toBe(1);
  });

  it("boundary counters: 4s and 6s only on boundary bat runs", () => {
    const s = replayInnings(cfg(), [
      ball({ runsOffBat: 4 }),
      ball({ runsOffBat: 6 }),
      ball({ runsOffBat: 4, batRunsAreBoundary: false }), // all-run 4
    ]);
    expect(s.batters["A"].fours).toBe(1);
    expect(s.batters["A"].sixes).toBe(1);
  });
});

// ----------------------------------------------------------------
// Undo / edit — deterministic replay (backend-spec "Undo / edit")
// ----------------------------------------------------------------

describe("undo / edit replay", () => {
  // A hits 4; the single puts B on strike; B is bowled; C comes in on strike.
  const sequence: InningsEvent[] = [
    ball({ runsOffBat: 4 }),
    ball({ runsOffBat: 1 }),
    ball({ extraType: "WIDE", extraRuns: 1 }),
    ball({
      wicket: { type: "BOWLED", dismissedPlayerId: "B" },
      newBatterId: "C",
    }),
    ball({ runsOffBat: 6 }),
  ];

  it("replay is deterministic — identical input produces identical state", () => {
    const s1 = replayInnings(cfg(), sequence);
    const s2 = replayInnings(cfg(), sequence);
    expect(s1).toEqual(s2);
  });

  it("undo removes the latest ball and recomputes (never patches) aggregates", () => {
    const { state } = undoLastEvent(cfg(), sequence);
    expect(state.totalRuns).toBe(6); // 4 + 1 + 1wd
    expect(state.deliveries).toHaveLength(4);
    expect(state.batters["C"].runs).toBe(0);
  });

  it("editing a mid-innings ball (4 → 6) replays everything after it", () => {
    const { state } = editEvent(cfg(), sequence, 0, ball({ runsOffBat: 6 }));
    expect(state.totalRuns).toBe(6 + 1 + 1 + 0 + 6);
    expect(state.batters["A"].sixes).toBe(1);
    expect(state.batters["A"].fours).toBe(0);
    // downstream state (wicket, new batter) is reproduced intact
    expect(state.wickets).toBe(1);
    expect(state.batters["C"].runs).toBe(6);
  });

  it("editing a wicket away resurrects the batter and downstream strike resolves from events", () => {
    const { state } = editEvent(cfg(), sequence, 3, ball({ runsOffBat: 0 }));
    expect(state.wickets).toBe(0);
    expect(state.batters["B"].status).toBe("NOT_OUT");
    expect(state.batters["C"]).toBeUndefined(); // C never came in
    expect(state.batters["B"].runs).toBe(6); // the last six now belongs to B (strike re-derived)
  });

  it("edited state deep-equals a fresh replay of the edited sequence", () => {
    const edited = [...sequence];
    edited[1] = ball({ runsOffBat: 3 });
    const viaHelper = editEvent(cfg(), sequence, 1, edited[1]).state;
    const viaFresh = replayInnings(cfg(), edited);
    expect(viaHelper).toEqual(viaFresh);
  });
});

// ----------------------------------------------------------------
// Summary / snapshot derivation
// ----------------------------------------------------------------

describe("innings summary (live snapshot source)", () => {
  it("derives overs display, CRR, RRR, need and last balls", () => {
    const events: InningsEvent[] = [
      ball({ runsOffBat: 4 }),
      ball({ runsOffBat: 1 }),
      ball({ extraType: "WIDE", extraRuns: 1 }),
      ball({ runsOffBat: 6, bowlerId: "X" }),
    ];
    const s = replayInnings(
      cfg({ inningsNumber: 2, target: 50, oversLimit: 5 }),
      events,
    );
    const sum = getInningsSummary(s);
    expect(sum.totalRuns).toBe(12);
    expect(sum.legalBalls).toBe(3);
    expect(sum.oversDisplay).toBe("0.3");
    expect(sum.currentRunRate).toBeCloseTo(12 / (3 / 6), 5);
    expect(sum.runsNeeded).toBe(38);
    expect(sum.ballsRemaining).toBe(27);
    expect(sum.requiredRunRate).toBeCloseTo(38 / (27 / 6), 5);
    expect(sum.lastBalls.map((b) => b.label)).toEqual(["4", "1", "WD", "6"]);
  });

  it("ball labels: W beats extras; byes show the runs", () => {
    const s = replayInnings(cfg(), [
      ball({
        extraType: "WIDE",
        extraRuns: 1,
        wicket: { type: "STUMPED", dismissedPlayerId: "A" },
        newBatterId: "C",
      }),
      ball({ extraType: "BYE", extraRuns: 2, bowlerId: "X" }),
    ]);
    expect(ballLabel(s.deliveries[0])).toBe("W");
    expect(ballLabel(s.deliveries[1])).toBe("2");
  });
});

// ----------------------------------------------------------------
// Input guards
// ----------------------------------------------------------------

describe("input guards", () => {
  it("rejects runs off the bat on a wide", () => {
    expectScoringError(
      () => replayInnings(cfg(), [ball({ extraType: "WIDE", extraRuns: 1, runsOffBat: 1 })]),
      "INVALID_INPUT",
    );
  });

  it("rejects a dismissal of a player not at the crease", () => {
    expectScoringError(
      () =>
        replayInnings(cfg(), [
          ball({ wicket: { type: "RUN_OUT", dismissedPlayerId: "Z" }, newBatterId: "C" }),
        ]),
      "BATTER_NOT_AT_CREASE",
    );
  });

  it("rejects bowled for the NON-striker", () => {
    expectScoringError(
      () =>
        replayInnings(cfg(), [
          ball({ wicket: { type: "BOWLED", dismissedPlayerId: "B" }, newBatterId: "C" }),
        ]),
      "INVALID_INPUT",
    );
  });

  it("rejects an incoming batter who is not in the configured XI", () => {
    expectScoringError(
      () =>
        replayInnings(cfg({ battingOrder: ["A", "B", "C"] }), [
          ball({ wicket: { type: "BOWLED", dismissedPlayerId: "A" }, newBatterId: "Z" }),
        ]),
      "BATTER_NOT_IN_XI",
    );
  });

  it("rejects identical opening batters", () => {
    expectScoringError(
      () => createInnings(cfg({ openingNonStrikerId: "A" })),
      "INVALID_INPUT",
    );
  });

  it("swapEnds event swaps the strike (admin correction)", () => {
    let s = createInnings(cfg());
    s = applyEvent(s, { kind: "swapEnds" });
    expect(s.strikerId).toBe("B");
  });
});

// ----------------------------------------------------------------
// Maidens
// ----------------------------------------------------------------

describe("maidens", () => {
  it("six dots = a maiden; a single anywhere in the over breaks it", () => {
    const maiden: InningsState = replayInnings(cfg(), dots(6));
    expect(maiden.bowlers["X"].maidens).toBe(1);

    const notMaiden = replayInnings(cfg(), [...dots(5), ball({ runsOffBat: 1 })]);
    expect(notMaiden.bowlers["X"].maidens).toBe(0);
  });

  it("a wide breaks the maiden (bowler is charged)", () => {
    const s = replayInnings(cfg(), [
      ...dots(5),
      ball({ extraType: "WIDE", extraRuns: 1 }),
      ball({}),
    ]);
    expect(s.bowlers["X"].maidens).toBe(0);
  });
});
