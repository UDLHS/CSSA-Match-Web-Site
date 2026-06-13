/**
 * Seed: CSSA Cricket Fiesta '26 sample data.
 *
 * Every ball is generated THROUGH the scoring engine (applyEvent), persisted
 * with the same codec the server actions use, then pushed through the real
 * sync + snapshot + leaderboard pipeline — so the seed doubles as an
 * end-to-end test of the Phase 2 data layer.
 *
 *   - 1 tournament / season / settings, 2 venues, 4 teams × 12 players
 *   - Match 1: COMPLETED (full T20, both innings, result + Player of Match)
 *   - Match 2: LIVE mid-chase (innings 2 around the 12th over)
 *   - Matches 3 & 4: UPCOMING
 *   - Popular votes, leaderboard snapshots, audit trail entry
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import {
  applyEvent,
  createInnings,
  DEFAULT_POINTS_CONFIG,
  type DeliveryEvent,
  type InningsConfig,
  type InningsEvent,
  type InningsState,
} from "@/lib/scoring";
import { encodeEventRow } from "@/server/scoring/codec";
import {
  loadInningsContext,
  syncInningsDerived,
} from "@/server/scoring/persist";
import { refreshSnapshot } from "@/server/scoring/snapshot";
import { rebuildSeasonStats } from "@/server/scoring/leaderboard";

const prisma = new PrismaClient();

// Deterministic RNG — reseeding gives identical data on every run.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------------------------------------------
// Static data
// ----------------------------------------------------------------

const TEAMS = [
  {
    name: "CS Titans",
    shortName: "CST",
    primaryColor: "#1d4ed8",
    secondaryColor: "#93c5fd",
    coach: "Ruwan Weerasinghe",
    groupName: "A",
  },
  {
    name: "SE Strikers",
    shortName: "SES",
    primaryColor: "#b91c1c",
    secondaryColor: "#fca5a5",
    coach: "Mahesh Abeywardena",
    groupName: "A",
  },
  {
    name: "IS Vipers",
    shortName: "ISV",
    primaryColor: "#047857",
    secondaryColor: "#6ee7b7",
    coach: "Chaminda Lakmal",
    groupName: "B",
  },
  {
    name: "CN Falcons",
    shortName: "CNF",
    primaryColor: "#6d28d9",
    secondaryColor: "#c4b5fd",
    coach: "Sampath Jayaweera",
    groupName: "B",
  },
] as const;

// 12 names per team, index-aligned with TEAMS.
const SQUADS: string[][] = [
  [
    "Kasun Perera", "Nuwan Silva", "Dasun Fernando", "Pathum Mendis",
    "Kusal Rajapaksa", "Charith Bandara", "Wanindu Jayasuriya",
    "Maheesh Gunathilaka", "Dilshan Karunaratne", "Lahiru Chandimal",
    "Sadeera Samarawickrama", "Dinesh Hasaranga",
  ],
  [
    "Avishka Theekshana", "Bhanuka Madushka", "Chamika Asalanka",
    "Dushmantha Shanaka", "Praveen Wellalage", "Ramesh Pathirana",
    "Tharindu Madushanka", "Sahan Kumara", "Ashen Embuldeniya",
    "Janith Vandersay", "Pasindu Dickwella", "Ravindu Liyanage",
  ],
  [
    "Shehan Perera", "Kavindu Mendis", "Thisara Bandara", "Isuru Fernando",
    "Akila Jayasuriya", "Vishwa Karunaratne", "Minod Silva",
    "Nipun Rajapaksa", "Sithara Gunathilaka", "Yasiru Chandimal",
    "Dilruwan Samarawickrama", "Suranga Hasaranga",
  ],
  [
    "Asitha Asalanka", "Binura Madushka", "Matheesha Theekshana",
    "Nuwanidu Shanaka", "Dunith Pathirana", "Sadisha Wellalage",
    "Kamindu Madushanka", "Lasith Kumara", "Angelo Dickwella",
    "Ishan Embuldeniya", "Ryan Vandersay", "Senura Liyanage",
  ],
];

// Squad slot → cricket profile. Slot 2 keeps wicket; 4–10 can bowl.
const ROLES = [
  "BATTER", "BATTER", "WICKET_KEEPER", "BATTER", "ALL_ROUNDER",
  "ALL_ROUNDER", "BOWLER", "BOWLER", "BOWLER", "BOWLER", "BOWLER", "BATTER",
] as const;

const BOWLING_STYLES = [
  "RIGHT_ARM_FAST", "RIGHT_ARM_MEDIUM", "RIGHT_ARM_OFF_SPIN",
  "RIGHT_ARM_LEG_SPIN", "LEFT_ARM_FAST", "LEFT_ARM_ORTHODOX",
] as const;

// ----------------------------------------------------------------
// Innings simulation (every ball validated by the engine)
// ----------------------------------------------------------------

interface SimSide {
  xi: string[]; // playerIds in batting order
  bowlers: string[]; // rotation, adjacent entries differ
  keeperId: string;
}

interface SimResult {
  events: InningsEvent[];
  finalState: InningsState;
}

function simulateInnings(
  config: InningsConfig,
  batting: SimSide,
  bowling: SimSide,
  rand: () => number,
  stopAfterLegalBalls?: number,
): SimResult {
  const events: InningsEvent[] = [];
  let state = createInnings(config);
  let nextBatter = 2;

  const push = (ev: InningsEvent): InningsState => {
    state = applyEvent(state, ev);
    events.push(ev);
    return state;
  };

  outer: for (let over = 0; over < config.oversLimit; over++) {
    const bowlerId = bowling.bowlers[over % bowling.bowlers.length];
    const overEndsAt = (over + 1) * config.ballsPerOver;

    while (state.legalBalls < overEndsAt && state.status === "IN_PROGRESS") {
      if (
        stopAfterLegalBalls !== undefined &&
        state.legalBalls >= stopAfterLegalBalls
      ) {
        break outer;
      }
      const r = rand();
      const ball: DeliveryEvent = {
        kind: "delivery",
        bowlerId,
        runsOffBat: 0,
      };

      if (r < 0.04) {
        // Wide — occasionally the batters steal a run on it.
        ball.extraType = "WIDE";
        ball.extraRuns = rand() < 0.15 ? 2 : 1;
      } else if (r < 0.055) {
        // No-ball, sometimes hit for runs; next ball is a free hit.
        ball.extraType = "NO_BALL";
        ball.extraRuns = 1;
        const hit = rand();
        ball.runsOffBat = hit < 0.5 ? 0 : hit < 0.8 ? 1 : 4;
      } else if (r < 0.075) {
        const byeRuns = rand() < 0.7 ? 1 : 2;
        ball.extraType = rand() < 0.5 ? "BYE" : "LEG_BYE";
        ball.extraRuns = byeRuns;
      } else if (r < 0.105 && !state.freeHitPending) {
        // Wicket (kept off free hits to keep the generator simple).
        const w = rand();
        const strikerId = state.strikerId!;
        const fielderPool = bowling.xi.filter((id) => id !== bowlerId);
        const fielder =
          fielderPool[Math.floor(rand() * fielderPool.length)];
        const replacement =
          nextBatter < batting.xi.length ? batting.xi[nextBatter++] : null;
        if (w < 0.3) {
          ball.wicket = { type: "BOWLED", dismissedPlayerId: strikerId };
        } else if (w < 0.7) {
          ball.wicket = {
            type: "CAUGHT",
            dismissedPlayerId: strikerId,
            fielderId: fielder,
          };
        } else if (w < 0.85) {
          ball.wicket = { type: "LBW", dismissedPlayerId: strikerId };
        } else if (w < 0.95) {
          const direct = rand() < 0.3;
          ball.wicket = {
            type: "RUN_OUT",
            dismissedPlayerId: strikerId,
            fielderId: fielder,
            assistFielderId: direct ? undefined : bowling.keeperId,
            directHit: direct,
            battersCrossed: rand() < 0.4,
          };
        } else {
          ball.wicket = {
            type: "STUMPED",
            dismissedPlayerId: strikerId,
            fielderId: bowling.keeperId,
          };
        }
        ball.newBatterId = replacement;
      } else if (r < 0.42) {
        ball.runsOffBat = 0;
      } else if (r < 0.7) {
        ball.runsOffBat = 1;
      } else if (r < 0.79) {
        ball.runsOffBat = 2;
      } else if (r < 0.8) {
        ball.runsOffBat = 3;
      } else if (r < 0.93) {
        ball.runsOffBat = 4; // boundary by engine default
      } else {
        ball.runsOffBat = 6;
      }

      const after = push(ball);
      if (after.status === "COMPLETED") break outer;
    }
  }

  return { events, finalState: state };
}

/** Persist one simulated innings through the production write pipeline. */
async function persistInnings(opts: {
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  config: InningsConfig;
  events: InningsEvent[];
}): Promise<{ inningsId: string; finalState: InningsState }> {
  const { config } = opts;
  const innings = await prisma.innings.create({
    data: {
      matchId: opts.matchId,
      inningsNumber: opts.inningsNumber,
      battingTeamId: opts.battingTeamId,
      bowlingTeamId: opts.bowlingTeamId,
      status: "IN_PROGRESS",
      oversLimit: config.oversLimit,
      ballsPerOver: config.ballsPerOver,
      target: config.target ?? null,
      openingStrikerId: config.openingStrikerId,
      openingNonStrikerId: config.openingNonStrikerId,
    },
  });

  let prev = createInnings(config);
  let sequence = 1;
  for (const event of opts.events) {
    const next = applyEvent(prev, event);
    await prisma.delivery.create({
      data: encodeEventRow({
        inningsId: innings.id,
        ballsPerOver: config.ballsPerOver,
        sequence,
        event,
        prevState: prev,
        newState: next,
      }),
    });
    prev = next;
    sequence += 1;
  }

  // Round-trip check: decode-from-DB must equal the generated stream.
  const ctx = await loadInningsContext(prisma, innings.id);
  if (
    ctx.state.totalRuns !== prev.totalRuns ||
    ctx.state.wickets !== prev.wickets ||
    ctx.state.legalBalls !== prev.legalBalls ||
    ctx.state.strikerId !== prev.strikerId
  ) {
    throw new Error(
      `Seed round-trip mismatch in innings ${opts.inningsNumber} of match ${opts.matchId}: ` +
        `db ${ctx.state.totalRuns}/${ctx.state.wickets} vs sim ${prev.totalRuns}/${prev.wickets}`,
    );
  }
  await syncInningsDerived(prisma, ctx.innings, ctx.rows, ctx.events, ctx.state, 1);

  return { inningsId: innings.id, finalState: prev };
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

async function main() {
  console.log("→ wiping previous seed data…");
  await prisma.auditLog.deleteMany();
  await prisma.leaderboardSnapshot.deleteMany();
  await prisma.playerCareerStats.deleteMany();
  await prisma.popularVote.deleteMany();
  await prisma.scoreSnapshot.deleteMany();
  await prisma.delivery.deleteMany(); // wickets cascade
  await prisma.innings.deleteMany();
  await prisma.playingXI.deleteMany();
  await prisma.matchTeam.deleteMany();
  await prisma.playerMatchBattingStats.deleteMany();
  await prisma.playerMatchBowlingStats.deleteMany();
  await prisma.match.deleteMany();
  await prisma.playerTeamHistory.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.tournamentSettings.deleteMany();
  await prisma.season.deleteMany();
  await prisma.tournament.deleteMany();

  console.log("→ tournament, season, settings, venues…");
  const tournament = await prisma.tournament.create({
    data: {
      name: "CSSA Cricket Fiesta '26",
      organiser: "CSSA · University of Kelaniya",
    },
  });
  const season = await prisma.season.create({
    data: {
      tournamentId: tournament.id,
      label: "2026",
      isActive: true,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-07-15"),
      settings: {
        create: {
          defaultFormat: "T20",
          defaultOvers: 20,
          defaultBallsPerOver: 6,
          playersPerSide: 11,
          pointsConfig:
            DEFAULT_POINTS_CONFIG as unknown as Prisma.InputJsonValue,
        },
      },
    },
  });
  const [groundA, groundB] = await Promise.all([
    prisma.venue.create({
      data: {
        name: "University Grounds A",
        location: "University of Kelaniya",
        capacity: 1500,
        pitchType: "Turf",
      },
    }),
    prisma.venue.create({
      data: {
        name: "University Grounds B",
        location: "University of Kelaniya",
        capacity: 800,
        pitchType: "Matting",
      },
    }),
  ]);

  console.log("→ teams + squads…");
  const teamIds: string[] = [];
  const squads: string[][] = []; // playerIds per team, squad order
  for (let t = 0; t < TEAMS.length; t++) {
    const team = await prisma.team.create({
      data: {
        ...TEAMS[t],
        homeVenueId: t % 2 === 0 ? groundA.id : groundB.id,
        status: "ACTIVE",
        foundedYear: 2018 + t,
      },
    });
    teamIds.push(team.id);

    const playerIds: string[] = [];
    for (let p = 0; p < SQUADS[t].length; p++) {
      const role = ROLES[p];
      const player = await prisma.player.create({
        data: {
          fullName: SQUADS[t][p],
          teamId: team.id,
          jerseyNumber: t * 20 + p + 1,
          role,
          battingStyle: (t + p) % 3 === 0 ? "LEFT_HAND" : "RIGHT_HAND",
          bowlingStyle:
            role === "BOWLER" || role === "ALL_ROUNDER"
              ? BOWLING_STYLES[(t * 3 + p) % BOWLING_STYLES.length]
              : "NONE",
          isCaptain: p === 0,
          squadOrder: p + 1,
          status: "ACTIVE",
          teamHistory: { create: { teamId: team.id } },
        },
      });
      playerIds.push(player.id);
    }
    squads.push(playerIds);
    await prisma.team.update({
      where: { id: team.id },
      data: { captainId: playerIds[0] },
    });
  }

  const side = (t: number): SimSide => ({
    xi: squads[t].slice(0, 11),
    // 5-bowler rotation (3 specialists + 2 all-rounders), adjacent differ
    bowlers: [6, 7, 8, 4, 5].map((i) => squads[t][i]),
    keeperId: squads[t][2],
  });

  async function createFixture(opts: {
    matchNumber: number;
    home: number;
    away: number;
    scheduledAt: Date;
    venueId: string;
    status: "UPCOMING" | "LIVE" | "COMPLETED";
    toss?: { winner: number; decision: "BAT" | "BOWL" };
  }) {
    const match = await prisma.match.create({
      data: {
        seasonId: season.id,
        matchNumber: opts.matchNumber,
        stage: "Group stage",
        groupName: TEAMS[opts.home].groupName,
        format: "T20",
        oversPerSide: 20,
        ballsPerOver: 6,
        playersPerSide: 11,
        status: opts.status,
        scheduledAt: opts.scheduledAt,
        venueId: opts.venueId,
        publishedAt: new Date("2026-06-01"),
        umpire1: "S. Weerakkody",
        umpire2: "P. Dharmasena",
        tossWonByTeamId: opts.toss ? teamIds[opts.toss.winner] : null,
        tossDecision: opts.toss?.decision ?? null,
        matchTeams: {
          create: [
            { teamId: teamIds[opts.home], isHome: true },
            { teamId: teamIds[opts.away], isHome: false },
          ],
        },
      },
    });
    for (const t of [opts.home, opts.away]) {
      await prisma.playingXI.createMany({
        data: squads[t].slice(0, 11).map((playerId, i) => ({
          matchId: match.id,
          teamId: teamIds[t],
          playerId,
          battingOrder: i + 1,
          isKeeper: i === 2,
        })),
      });
    }
    return match;
  }

  const t20 = (
    inningsNumber: number,
    battingTeam: number,
    target?: number,
  ): InningsConfig => ({
    inningsNumber,
    oversLimit: 20,
    ballsPerOver: 6,
    battersPerSide: 11,
    target: target ?? null,
    openingStrikerId: squads[battingTeam][0],
    openingNonStrikerId: squads[battingTeam][1],
    battingOrder: squads[battingTeam].slice(0, 11),
  });

  // ---------- Match 1: COMPLETED — CS Titans vs SE Strikers ----------
  console.log("→ match 1 (completed): simulating both innings…");
  {
    const rand = mulberry32(260601);
    const match = await createFixture({
      matchNumber: 1,
      home: 0,
      away: 1,
      scheduledAt: new Date("2026-06-08T14:00:00Z"),
      venueId: groundA.id,
      status: "COMPLETED",
      toss: { winner: 0, decision: "BAT" },
    });

    const i1 = simulateInnings(t20(1, 0), side(0), side(1), rand);
    const p1 = await persistInnings({
      matchId: match.id,
      inningsNumber: 1,
      battingTeamId: teamIds[0],
      bowlingTeamId: teamIds[1],
      config: t20(1, 0),
      events: i1.events,
    });

    const target = p1.finalState.totalRuns + 1;
    const i2 = simulateInnings(t20(2, 1, target), side(1), side(0), rand);
    const p2 = await persistInnings({
      matchId: match.id,
      inningsNumber: 2,
      battingTeamId: teamIds[1],
      bowlingTeamId: teamIds[0],
      config: t20(2, 1, target),
      events: i2.events,
    });

    // Result from the final states (same rules as completeMatch).
    const s2 = p2.finalState;
    let resultText: string;
    let winnerTeamId: string | null;
    if (s2.totalRuns >= target) {
      const wktsLeft = 10 - s2.wickets;
      winnerTeamId = teamIds[1];
      resultText = `${TEAMS[1].name} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`;
    } else if (s2.totalRuns === target - 1) {
      winnerTeamId = null;
      resultText = "Match tied";
    } else {
      winnerTeamId = teamIds[0];
      resultText = `${TEAMS[0].name} won by ${target - 1 - s2.totalRuns} runs`;
    }

    // Player of the match: top scorer across both innings.
    const allBatters = [
      ...Object.values(p1.finalState.batters),
      ...Object.values(s2.batters),
    ].sort((a, b) => b.runs - a.runs);
    const pomId = allBatters[0].playerId;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "COMPLETED",
        resultText,
        winnerTeamId,
        playerOfMatchId: pomId,
      },
    });
    await refreshSnapshot(prisma, match.id);
    console.log(
      `   ${TEAMS[0].shortName} ${p1.finalState.totalRuns}/${p1.finalState.wickets} — ` +
        `${TEAMS[1].shortName} ${s2.totalRuns}/${s2.wickets} → ${resultText}`,
    );
  }

  // ---------- Match 2: LIVE mid-chase — IS Vipers vs CN Falcons ----------
  console.log("→ match 2 (LIVE): innings 1 full, innings 2 mid-chase…");
  {
    const rand = mulberry32(260602);
    const match = await createFixture({
      matchNumber: 2,
      home: 2,
      away: 3,
      scheduledAt: new Date("2026-06-11T09:30:00Z"),
      venueId: groundA.id,
      status: "LIVE",
      toss: { winner: 3, decision: "BOWL" },
    });

    const i1 = simulateInnings(t20(1, 2), side(2), side(3), rand);
    const p1 = await persistInnings({
      matchId: match.id,
      inningsNumber: 1,
      battingTeamId: teamIds[2],
      bowlingTeamId: teamIds[3],
      config: t20(1, 2),
      events: i1.events,
    });

    const target = p1.finalState.totalRuns + 1;
    // Stop the chase after 12 overs — frozen mid-innings for the live hero.
    const i2 = simulateInnings(t20(2, 3, target), side(3), side(2), rand, 72);
    const p2 = await persistInnings({
      matchId: match.id,
      inningsNumber: 2,
      battingTeamId: teamIds[3],
      bowlingTeamId: teamIds[2],
      config: t20(2, 3, target),
      events: i2.events,
    });

    await refreshSnapshot(prisma, match.id);
    console.log(
      `   ${TEAMS[2].shortName} ${p1.finalState.totalRuns}/${p1.finalState.wickets} — ` +
        `${TEAMS[3].shortName} ${p2.finalState.totalRuns}/${p2.finalState.wickets} ` +
        `(${p2.finalState.legalBalls} balls, chasing ${target})`,
    );
  }

  // ---------- Matches 3 & 4: UPCOMING ----------
  console.log("→ matches 3 & 4 (upcoming)…");
  for (const fixture of [
    {
      matchNumber: 3,
      home: 0,
      away: 2,
      scheduledAt: new Date("2026-06-13T14:00:00Z"),
      venueId: groundB.id,
    },
    {
      matchNumber: 4,
      home: 1,
      away: 3,
      scheduledAt: new Date("2026-06-14T09:30:00Z"),
      venueId: groundA.id,
    },
  ]) {
    const match = await createFixture({ ...fixture, status: "UPCOMING" });
    await refreshSnapshot(prisma, match.id);
  }

  // ---------- Popular votes ----------
  console.log("→ popular votes…");
  const voteRows = [
    { t: 0, p: 0, votes: 1240 },
    { t: 1, p: 4, votes: 1105 },
    { t: 2, p: 0, votes: 980 },
    { t: 3, p: 2, votes: 870 },
    { t: 0, p: 6, votes: 765 },
    { t: 2, p: 5, votes: 640 },
    { t: 1, p: 1, votes: 530 },
    { t: 3, p: 7, votes: 410 },
  ];
  for (const v of voteRows) {
    await prisma.popularVote.create({
      data: {
        playerId: squads[v.t][v.p],
        votes: v.votes,
        note: "Seed baseline",
      },
    });
  }

  // ---------- Leaderboards ----------
  console.log("→ rebuilding leaderboards…");
  const rebuild = await rebuildSeasonStats(prisma, season.id, "seed");
  console.log(
    `   ${rebuild.players} players, ${rebuild.ballsProcessed} balls processed`,
  );

  await prisma.auditLog.create({
    data: {
      action: "seed.run",
      entityType: "Season",
      entityId: season.id,
      details: "Database seeded with sample tournament data",
    },
  });

  // ---------- Verification summary ----------
  const [matches, deliveries, snapshots, players] = await Promise.all([
    prisma.match.count(),
    prisma.delivery.count(),
    prisma.scoreSnapshot.count(),
    prisma.player.count(),
  ]);
  console.log("\n✓ Seed complete:");
  console.log(`   matches: ${matches} · deliveries: ${deliveries} · snapshots: ${snapshots} · players: ${players}`);

  const live = await prisma.scoreSnapshot.findFirst({
    where: { status: "LIVE" },
  });
  if (live) {
    const payload = live.payload as { live?: { runs: number; wickets: number; oversDisplay: string; runsNeeded: number | null } };
    console.log(
      `   LIVE snapshot v${live.version}: ${payload.live?.runs}/${payload.live?.wickets} in ${payload.live?.oversDisplay} ov, need ${payload.live?.runsNeeded}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
