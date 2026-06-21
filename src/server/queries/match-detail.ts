import { unstable_cache } from "next/cache";
import type { WicketType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { TAG, TTL } from "@/server/cache";
import { oversDisplay, currentRunRate, economyRate } from "@/lib/scoring";
import { shortName } from "@/lib/format";
import type {
  DetailBall,
  DetailFowRow,
  DetailInnings,
  DetailOver,
  DetailTeam,
  MatchDetailDTO,
} from "@/lib/match-detail-types";

/** Public scorecard/FoW/ball-by-ball payload for the match modal & page. */

const WICKET_LABEL: Record<WicketType, string> = {
  BOWLED: "Bowled",
  CAUGHT: "Caught",
  CAUGHT_AND_BOWLED: "Caught & bowled",
  LBW: "LBW",
  RUN_OUT: "Run out",
  STUMPED: "Stumped",
  HIT_WICKET: "Hit wicket",
  RETIRED_HURT: "Retired hurt",
  RETIRED_OUT: "Retired out",
  OBSTRUCTING_FIELD: "Obstructing the field",
  HIT_BALL_TWICE: "Hit ball twice",
  TIMED_OUT: "Timed out",
  OTHER: "Out",
};

/**
 * Cached for a couple of seconds: the match page polls this and many viewers
 * of the same match share one DB read per window. Real-time enough for cricket.
 */
export const getMatchDetailDTO = unstable_cache(
  getMatchDetailDTOImpl,
  ["public:getMatchDetailDTO"],
  { revalidate: TTL.live, tags: [TAG.matches] },
);

async function getMatchDetailDTOImpl(
  matchId: string,
): Promise<MatchDetailDTO | null> {
  const match = await prisma.match.findFirst({
    where: { id: matchId, deletedAt: null, status: { not: "DRAFT" } },
    include: {
      venue: true,
      matchTeams: { include: { team: true } },
      tossWonBy: true,
      playerOfMatch: { select: { id: true, fullName: true } },
      playingXI: {
        include: { player: { select: { id: true, fullName: true } } },
        orderBy: { battingOrder: "asc" },
      },
      battingStats: {
        include: { player: { select: { id: true, fullName: true, photoUrl: true } } },
        orderBy: { battingOrder: "asc" },
      },
      bowlingStats: {
        include: { player: { select: { id: true, fullName: true, photoUrl: true } } },
      },
      innings: {
        orderBy: { inningsNumber: "asc" },
        include: {
          deliveries: {
            orderBy: { sequence: "asc" },
            include: {
              wicket: {
                include: {
                  dismissedPlayer: { select: { fullName: true } },
                  fielder: { select: { fullName: true } },
                  assistFielder: { select: { fullName: true } },
                },
              },
              bowler: { select: { fullName: true } },
              striker: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });
  if (!match) return null;

  const toTeam = (t: {
    id: string;
    name: string;
    shortName: string;
    logoUrl: string | null;
    primaryColor: string;
  }): DetailTeam => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    logoUrl: t.logoUrl,
    primaryColor: t.primaryColor,
  });

  const home = match.matchTeams.find((mt) => mt.isHome)?.team ?? null;
  const away = match.matchTeams.find((mt) => !mt.isHome)?.team ?? null;
  const teamById = new Map(match.matchTeams.map((mt) => [mt.teamId, mt.team]));

  // ---- innings sections ----------------------------------------------------
  const inningsDTOs: DetailInnings[] = match.innings.map((inn) => {
    const battingTeam = teamById.get(inn.battingTeamId)!;
    const bowlingTeam = teamById.get(inn.bowlingTeamId)!;

    const batting = match.battingStats
      .filter((b) => b.teamId === inn.battingTeamId)
      .map((b) => ({
        playerId: b.playerId,
        name: b.player.fullName,
        photoUrl: b.player.photoUrl,
        how: b.dismissalText ?? (b.notOut ? "not out" : "—"),
        notOut: b.notOut,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        strikeRate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "—",
      }));

    const bowling = match.bowlingStats
      .filter((b) => b.teamId === inn.bowlingTeamId)
      .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
      .map((b) => ({
        playerId: b.playerId,
        name: b.player.fullName,
        photoUrl: b.player.photoUrl,
        overs: oversDisplay(b.legalBalls, inn.ballsPerOver),
        maidens: b.maidens,
        runs: b.runsConceded,
        wickets: b.wickets,
        economy:
          economyRate(b.runsConceded, b.legalBalls, inn.ballsPerOver)?.toFixed(2) ?? "—",
      }));

    const fow: DetailFowRow[] = [];
    const overMap = new Map<number, DetailOver>();

    for (const d of inn.deliveries) {
      // FoW rows (true dismissals only — retired hurt is not a wicket)
      if (d.wicket && d.wicket.type !== "RETIRED_HURT") {
        const w = d.wicket;
        const fielderBits: string[] = [];
        if (w.fielder) {
          fielderBits.push(
            w.directHit
              ? `${shortName(w.fielder.fullName)} (direct hit)`
              : shortName(w.fielder.fullName),
          );
        }
        if (w.assistFielder) fielderBits.push(shortName(w.assistFielder.fullName));
        fow.push({
          wicketNumber: w.wicketNumber,
          scoreText: `${w.scoreAtFall}/${w.wicketNumber}`,
          overBall: w.overBall,
          playerOut: w.dismissedPlayer.fullName,
          typeLabel: WICKET_LABEL[w.type],
          bowler: w.bowlerCredited && d.bowler ? shortName(d.bowler.fullName) : null,
          fielder: fielderBits.length > 0 ? fielderBits.join(" / ") : null,
        });
      }

      // Ball-by-ball (real balls only — penalties/retirements aren't balls)
      if (!d.isNonBall) {
        const label = ballLabel(d);
        const over = overMap.get(d.overNumber) ?? {
          over: d.overNumber + 1,
          balls: [],
          runs: 0,
        };
        over.balls.unshift({
          overBall: `${d.overNumber}.${d.ballInOver}`,
          label,
          text: d.commentary ?? generateBallText(d),
        });
        over.runs += d.runsOffBat + d.extraRuns;
        overMap.set(d.overNumber, over);
      }
    }

    return {
      inningsNumber: inn.inningsNumber,
      battingTeam: toTeam(battingTeam),
      bowlingTeam: toTeam(bowlingTeam),
      runs: inn.totalRuns,
      wickets: inn.wickets,
      oversDisplay: oversDisplay(inn.legalBalls, inn.ballsPerOver),
      runRate: currentRunRate(inn.totalRuns, inn.legalBalls, inn.ballsPerOver)?.toFixed(2) ?? "—",
      target: inn.target,
      status: inn.status,
      extras: {
        wides: inn.wides,
        noBalls: inn.noBalls,
        byes: inn.byes,
        legByes: inn.legByes,
        penalties: inn.penalties,
        total: inn.wides + inn.noBalls + inn.byes + inn.legByes + inn.penalties,
      },
      batting,
      bowling,
      fow,
      overs: [...overMap.values()].sort((a, b) => b.over - a.over),
    };
  });

  // ---- headline figures ----------------------------------------------------
  const topBat = [...match.battingStats].sort((a, b) => b.runs - a.runs)[0];
  const topBowl = [...match.bowlingStats].sort(
    (a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded,
  )[0];

  // ---- status line ----------------------------------------------------------
  let statusLine: string | null = match.resultText;
  const lastInnings = match.innings[match.innings.length - 1];
  if (
    (match.status === "LIVE" || match.status === "INNINGS_BREAK") &&
    lastInnings
  ) {
    if (lastInnings.target != null) {
      const need = Math.max(lastInnings.target - lastInnings.totalRuns, 0);
      const ballsLeft = Math.max(
        lastInnings.oversLimit * lastInnings.ballsPerOver - lastInnings.legalBalls,
        0,
      );
      const battingName = teamById.get(lastInnings.battingTeamId)?.name ?? "Chasing side";
      statusLine = `${battingName} need ${need} run${need === 1 ? "" : "s"} off ${ballsLeft} balls`;
    } else {
      const battingName = teamById.get(lastInnings.battingTeamId)?.name ?? "Batting side";
      statusLine = `${battingName} batting · ${lastInnings.inningsNumber === 1 ? "1st" : "2nd"} innings`;
    }
  }

  const lastBalls =
    lastInnings?.deliveries
      .filter((d) => !d.isNonBall)
      .slice(-6)
      .map((d) => ({
        overBall: `${d.overNumber}.${d.ballInOver}`,
        label: ballLabel(d),
      })) ?? [];

  const tossText =
    match.tossWonBy && match.tossDecision
      ? `${match.tossWonBy.name} won the toss & elected to ${match.tossDecision === "BAT" ? "bat" : "bowl"}`
      : null;

  return {
    matchId: match.id,
    matchNumber: match.matchNumber,
    stage: match.stage,
    format: match.format,
    status: match.status,
    scheduledAt: match.scheduledAt.toISOString(),
    venue: match.venue
      ? { name: match.venue.name, location: match.venue.location }
      : null,
    teams: {
      home: home ? toTeam(home) : null,
      away: away ? toTeam(away) : null,
    },
    tossText,
    statusLine,
    resultText: match.resultText,
    playerOfMatch: match.playerOfMatch
      ? { id: match.playerOfMatch.id, name: match.playerOfMatch.fullName }
      : null,
    topScorer: topBat
      ? { name: shortName(topBat.player.fullName), line: `${topBat.runs} off ${topBat.balls}` }
      : null,
    bestBowler:
      topBowl && topBowl.legalBalls > 0
        ? {
            name: shortName(topBowl.player.fullName),
            line: `${topBowl.wickets}/${topBowl.runsConceded} (${oversDisplay(topBowl.legalBalls)})`,
          }
        : null,
    lastBalls,
    umpires: [match.umpire1, match.umpire2, match.thirdUmpire].filter(
      (u): u is string => !!u,
    ),
    notes: match.notes,
    innings: inningsDTOs,
    playingXI: match.matchTeams.map((mt) => ({
      team: toTeam(mt.team),
      players: match.playingXI
        .filter((p) => p.teamId === mt.teamId)
        .map((p) => ({
          playerId: p.playerId,
          name: p.player.fullName,
          battingOrder: p.battingOrder,
          isKeeper: p.isKeeper,
        })),
    })),
  };
}

interface BallRow {
  runsOffBat: number;
  extraType: string | null;
  extraRuns: number;
  isFreeHit: boolean;
  wicket: { type: WicketType; dismissedPlayer: { fullName: string } } | null;
  bowler: { fullName: string } | null;
  striker: { fullName: string } | null;
}

function ballLabel(d: BallRow): string {
  if (d.wicket && d.wicket.type !== "RETIRED_HURT") return "W";
  if (d.extraType === "WIDE") return d.extraRuns > 1 ? `WD${d.extraRuns}` : "WD";
  if (d.extraType === "NO_BALL") {
    const total = d.runsOffBat + d.extraRuns;
    return total > 1 ? `NB${total}` : "NB";
  }
  if (d.extraType === "BYE" || d.extraType === "LEG_BYE") return String(d.extraRuns);
  return String(d.runsOffBat);
}

function generateBallText(d: BallRow): string {
  const who =
    d.bowler && d.striker
      ? `${shortName(d.bowler.fullName)} to ${shortName(d.striker.fullName)} — `
      : "";
  if (d.wicket && d.wicket.type !== "RETIRED_HURT") {
    return `${who}OUT! ${WICKET_LABEL[d.wicket.type]} — ${shortName(d.wicket.dismissedPlayer.fullName)}`;
  }
  if (d.extraType === "WIDE") {
    return `${who}wide${d.extraRuns > 1 ? `, ${d.extraRuns - 1} extra` : ""}`;
  }
  if (d.extraType === "NO_BALL") {
    return `${who}NO BALL${d.runsOffBat ? ` + ${d.runsOffBat} off the bat` : ""} — free hit next`;
  }
  if (d.extraType === "BYE") return `${who}${d.extraRuns} bye${d.extraRuns === 1 ? "" : "s"}`;
  if (d.extraType === "LEG_BYE") return `${who}${d.extraRuns} leg bye${d.extraRuns === 1 ? "" : "s"}`;
  const r = d.runsOffBat;
  const desc =
    r === 0 ? "no run" : r === 1 ? "single" : r === 4 ? "FOUR!" : r === 6 ? "SIX!" : `${r} runs`;
  return `${who}${desc}${d.isFreeHit ? " (free hit)" : ""}`;
}
