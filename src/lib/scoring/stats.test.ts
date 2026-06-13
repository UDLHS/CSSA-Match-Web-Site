/**
 * §3.9 stat ordering & guards + base-calculation formulas.
 */

import { describe, expect, it } from "vitest";
import {
  battingAverage,
  bowlingAverage,
  bowlingStrikeRate,
  chaseTarget,
  compareBestBowling,
  compareHighestScore,
  computeOverallPoints,
  currentRunRate,
  DEFAULT_POINTS_CONFIG,
  economyRate,
  formatBowlingFigures,
  formatHighScore,
  oversDisplay,
  requiredRunRate,
  strikeRate,
} from "./stats";

describe("overs display", () => {
  it("17 legal balls → 2.5 (the spec's own example)", () => {
    expect(oversDisplay(17)).toBe("2.5");
  });
  it("0 → 0.0, 6 → 1.0, 121 → 20.1", () => {
    expect(oversDisplay(0)).toBe("0.0");
    expect(oversDisplay(6)).toBe("1.0");
    expect(oversDisplay(121)).toBe("20.1");
  });
  it("respects non-standard balls per over (The Hundred: 5)", () => {
    expect(oversDisplay(12, 5)).toBe("2.2");
  });
});

describe("target & run rates", () => {
  it("target = innings-1 total + 1", () => {
    expect(chaseTarget(162)).toBe(163);
  });
  it("CRR uses decimal overs, not the display form", () => {
    // 48 runs off 30 balls = 48 / 5.0 overs = 9.6 — NOT 48/“4.6”
    expect(currentRunRate(48, 30)).toBeCloseTo(9.6, 5);
    // 147 off 99 balls (16.3 ov) = 147 / 16.5
    expect(currentRunRate(147, 99)).toBeCloseTo(147 / 16.5, 5);
  });
  it("RRR: 16 needed off 21 balls → 4.57", () => {
    expect(requiredRunRate(16, 21)).toBeCloseTo(4.5714, 3);
  });
  it("guards: no balls faced / none remaining → null, never NaN/Infinity", () => {
    expect(currentRunRate(0, 0)).toBeNull();
    expect(requiredRunRate(10, 0)).toBeNull();
  });
});

describe("§3.9 divide-by-zero guards", () => {
  it("strike rate with zero balls is null", () => {
    expect(strikeRate(0, 0)).toBeNull();
    expect(strikeRate(58, 41)).toBeCloseTo(141.46, 2);
  });
  it("batting average with zero dismissals is null (not-out streak)", () => {
    expect(battingAverage(120, 0)).toBeNull();
    expect(battingAverage(120, 3)).toBeCloseTo(40, 5);
  });
  it("economy with zero legal balls is null", () => {
    expect(economyRate(0, 0)).toBeNull();
    expect(economyRate(28, 24)).toBeCloseTo(7.0, 5);
  });
  it("bowling average / SR with zero wickets are null", () => {
    expect(bowlingAverage(35, 0)).toBeNull();
    expect(bowlingStrikeRate(24, 0)).toBeNull();
  });
});

describe("§3.9 best bowling ordering", () => {
  it("more wickets beats fewer, regardless of runs", () => {
    expect(
      compareBestBowling(
        { wickets: 3, runsConceded: 28 },
        { wickets: 2, runsConceded: 10 },
      ),
    ).toBeLessThan(0);
  });
  it("equal wickets: fewer runs wins the tiebreak", () => {
    expect(
      compareBestBowling(
        { wickets: 3, runsConceded: 20 },
        { wickets: 3, runsConceded: 28 },
      ),
    ).toBeLessThan(0);
  });
  it("sorts a season correctly", () => {
    const figures = [
      { wickets: 2, runsConceded: 8 },
      { wickets: 3, runsConceded: 28 },
      { wickets: 3, runsConceded: 20 },
      { wickets: 0, runsConceded: 12 },
    ];
    const best = [...figures].sort(compareBestBowling)[0];
    expect(formatBowlingFigures(best)).toBe("3/20");
  });
});

describe("§3.9 highest score tracks not-out", () => {
  it("50* beats 50", () => {
    expect(
      compareHighestScore({ runs: 50, notOut: true }, { runs: 50, notOut: false }),
    ).toBeLessThan(0);
  });
  it("more runs beats not-out flag", () => {
    expect(
      compareHighestScore({ runs: 58, notOut: false }, { runs: 50, notOut: true }),
    ).toBeLessThan(0);
  });
  it("formats with the star", () => {
    expect(formatHighScore({ runs: 52, notOut: true })).toBe("52*");
    expect(formatHighScore({ runs: 34, notOut: false })).toBe("34");
  });
});

describe("overall points — single tweakable config (§2C)", () => {
  const base = {
    runs: 0,
    fours: 0,
    sixes: 0,
    fifties: 0,
    hundreds: 0,
    wickets: 0,
    runsConceded: 0,
    legalBallsBowled: 0,
    maidens: 0,
    catches: 0,
    stumpings: 0,
    directHitRunOuts: 0,
    assistedRunOuts: 0,
  };

  it("computes the documented arithmetic exactly", () => {
    const pts = computeOverallPoints({
      ...base,
      runs: 246,
      fours: 20,
      sixes: 8,
      fifties: 3,
      wickets: 4,
      runsConceded: 90,
      legalBallsBowled: 60, // 10 overs, economy 9 → no bonus
      maidens: 1,
      catches: 3,
      directHitRunOuts: 1,
    });
    // batting: 246·1 + 20·2 + 8·4 + 3·10 = 348
    expect(pts.battingPoints).toBe(348);
    // bowling: 4·20 − 90 + 1·5 = −5
    expect(pts.bowlingPoints).toBe(-5);
    // fielding: 3·8 + 1·10 = 34
    expect(pts.fieldingPoints).toBe(34);
    expect(pts.totalPoints).toBe(348 - 5 + 34);
  });

  it("awards the economy bonus at/below the threshold with ≥2 overs bowled", () => {
    const pts = computeOverallPoints({
      ...base,
      wickets: 2,
      runsConceded: 30,
      legalBallsBowled: 36, // 6 overs, economy 5 ≤ 6 → +10
    });
    expect(pts.bowlingPoints).toBe(2 * 20 - 30 + 10);
  });

  it("no economy bonus for a 1-over cameo", () => {
    const pts = computeOverallPoints({
      ...base,
      runsConceded: 2,
      legalBallsBowled: 6, // economy 2, but only 1 over
    });
    expect(pts.bowlingPoints).toBe(-2);
  });

  it("weights are admin-tweakable through the config object", () => {
    const pts = computeOverallPoints(
      { ...base, runs: 10, sixes: 1 },
      {
        ...DEFAULT_POINTS_CONFIG,
        batting: { ...DEFAULT_POINTS_CONFIG.batting, perRun: 2, perSix: 10 },
      },
    );
    expect(pts.battingPoints).toBe(10 * 2 + 1 * 10);
  });
});
