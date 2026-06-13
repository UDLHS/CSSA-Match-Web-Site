-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SCORE_UPDATER');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('T10', 'T20', 'ODI', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('DRAFT', 'UPCOMING', 'LIVE', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "InningsStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InningsCloseReason" AS ENUM ('ALL_OUT', 'OVERS_COMPLETE', 'TARGET_REACHED', 'DECLARED', 'MANUAL');

-- CreateEnum
CREATE TYPE "TossDecision" AS ENUM ('BAT', 'BOWL');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER');

-- CreateEnum
CREATE TYPE "BattingStyle" AS ENUM ('RIGHT_HAND', 'LEFT_HAND');

-- CreateEnum
CREATE TYPE "BowlingStyle" AS ENUM ('RIGHT_ARM_FAST', 'RIGHT_ARM_MEDIUM', 'RIGHT_ARM_OFF_SPIN', 'RIGHT_ARM_LEG_SPIN', 'LEFT_ARM_FAST', 'LEFT_ARM_MEDIUM', 'LEFT_ARM_ORTHODOX', 'LEFT_ARM_WRIST_SPIN', 'NONE');

-- CreateEnum
CREATE TYPE "WicketType" AS ENUM ('BOWLED', 'CAUGHT', 'CAUGHT_AND_BOWLED', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_HURT', 'RETIRED_OUT', 'OBSTRUCTING_FIELD', 'HIT_BALL_TWICE', 'TIMED_OUT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtraType" AS ENUM ('WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY');

-- CreateEnum
CREATE TYPE "CreaseEnd" AS ENUM ('STRIKER_END', 'NON_STRIKER_END');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'INJURED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SponsorTier" AS ENUM ('TITLE', 'CO_SPONSOR', 'MEDIA_PARTNER', 'BEVERAGE_PARTNER', 'PARTNER');

-- CreateEnum
CREATE TYPE "SponsorStatus" AS ENUM ('ACTIVE', 'PENDING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HOME_LEADERBOARD_BANNER', 'HOME_SKYSCRAPER', 'MATCH_INFEED_BANNER', 'LEADERBOARD_BANNER', 'FOOTER_PARTNERS');

-- CreateEnum
CREATE TYPE "LeaderboardKind" AS ENUM ('BATTING', 'BOWLING', 'OVERALL', 'TEAM_STANDINGS', 'POPULARITY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "role" "AdminRole" NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT,
    "homeVenueId" TEXT,
    "captainId" TEXT,
    "coach" TEXT,
    "groupName" TEXT,
    "foundedYear" INTEGER,
    "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "teamId" TEXT,
    "jerseyNumber" INTEGER,
    "dateOfBirth" TIMESTAMP(3),
    "photoUrl" TEXT,
    "role" "PlayerRole" NOT NULL DEFAULT 'BATTER',
    "battingStyle" "BattingStyle" NOT NULL DEFAULT 'RIGHT_HAND',
    "bowlingStyle" "BowlingStyle" NOT NULL DEFAULT 'NONE',
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "squadOrder" INTEGER,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_team_history" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "toDate" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "player_team_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organiser" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_settings" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "defaultFormat" "MatchFormat" NOT NULL DEFAULT 'T20',
    "defaultOvers" INTEGER NOT NULL DEFAULT 20,
    "defaultBallsPerOver" INTEGER NOT NULL DEFAULT 6,
    "playersPerSide" INTEGER NOT NULL DEFAULT 11,
    "superOverOnTie" BOOLEAN NOT NULL DEFAULT false,
    "pointsWin" INTEGER NOT NULL DEFAULT 2,
    "pointsTie" INTEGER NOT NULL DEFAULT 1,
    "pointsLoss" INTEGER NOT NULL DEFAULT 0,
    "bonusPointEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nrrTiebreak" BOOLEAN NOT NULL DEFAULT true,
    "pointsConfig" JSONB,
    "votingOpen" BOOLEAN NOT NULL DEFAULT false,
    "votingOpensAt" TIMESTAMP(3),
    "votingClosesAt" TIMESTAMP(3),
    "voteOnePerDevice" BOOLEAN NOT NULL DEFAULT true,
    "votesPublic" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER,
    "pitchType" TEXT,
    "notes" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "stage" TEXT,
    "groupName" TEXT,
    "format" "MatchFormat" NOT NULL DEFAULT 'T20',
    "oversPerSide" INTEGER NOT NULL DEFAULT 20,
    "ballsPerOver" INTEGER NOT NULL DEFAULT 6,
    "playersPerSide" INTEGER NOT NULL DEFAULT 11,
    "status" "MatchStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "venueId" TEXT,
    "tossWonByTeamId" TEXT,
    "tossDecision" "TossDecision",
    "umpire1" TEXT,
    "umpire2" TEXT,
    "thirdUmpire" TEXT,
    "assignedScorerId" UUID,
    "resultText" TEXT,
    "winnerTeamId" TEXT,
    "playerOfMatchId" TEXT,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_teams" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "match_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playing_xi" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "battingOrder" INTEGER NOT NULL,
    "isKeeper" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "playing_xi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "innings" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "inningsNumber" INTEGER NOT NULL,
    "battingTeamId" TEXT NOT NULL,
    "bowlingTeamId" TEXT NOT NULL,
    "status" "InningsStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "closeReason" "InningsCloseReason",
    "oversLimit" INTEGER NOT NULL,
    "ballsPerOver" INTEGER NOT NULL DEFAULT 6,
    "target" INTEGER,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "legalBalls" INTEGER NOT NULL DEFAULT 0,
    "wides" INTEGER NOT NULL DEFAULT 0,
    "noBalls" INTEGER NOT NULL DEFAULT 0,
    "byes" INTEGER NOT NULL DEFAULT 0,
    "legByes" INTEGER NOT NULL DEFAULT 0,
    "penalties" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "innings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "inningsId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "overNumber" INTEGER NOT NULL,
    "ballInOver" INTEGER NOT NULL,
    "bowlerId" TEXT,
    "strikerId" TEXT,
    "nonStrikerId" TEXT,
    "runsOffBat" INTEGER NOT NULL DEFAULT 0,
    "extraType" "ExtraType",
    "extraRuns" INTEGER NOT NULL DEFAULT 0,
    "extrasAreBoundary" BOOLEAN NOT NULL DEFAULT false,
    "isLegal" BOOLEAN NOT NULL DEFAULT true,
    "isFreeHit" BOOLEAN NOT NULL DEFAULT false,
    "isNonBall" BOOLEAN NOT NULL DEFAULT false,
    "commentary" TEXT,
    "idempotencyKey" TEXT,
    "createdById" UUID,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wickets" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "type" "WicketType" NOT NULL,
    "dismissedPlayerId" TEXT NOT NULL,
    "bowlerCredited" BOOLEAN NOT NULL DEFAULT false,
    "fielderId" TEXT,
    "assistFielderId" TEXT,
    "directHit" BOOLEAN NOT NULL DEFAULT false,
    "battersCrossed" BOOLEAN NOT NULL DEFAULT false,
    "endWhereOut" "CreaseEnd",
    "newBatterId" TEXT,
    "notes" TEXT,
    "wicketNumber" INTEGER NOT NULL,
    "scoreAtFall" INTEGER NOT NULL,
    "overBall" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_snapshots" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" "MatchStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_batting_stats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "battingOrder" INTEGER NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "balls" INTEGER NOT NULL DEFAULT 0,
    "fours" INTEGER NOT NULL DEFAULT 0,
    "sixes" INTEGER NOT NULL DEFAULT 0,
    "notOut" BOOLEAN NOT NULL DEFAULT true,
    "dismissalType" "WicketType",
    "dismissalText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_match_batting_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_bowling_stats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "legalBalls" INTEGER NOT NULL DEFAULT 0,
    "maidens" INTEGER NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "wides" INTEGER NOT NULL DEFAULT 0,
    "noBalls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_match_bowling_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_career_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "ballsFaced" INTEGER NOT NULL DEFAULT 0,
    "fours" INTEGER NOT NULL DEFAULT 0,
    "sixes" INTEGER NOT NULL DEFAULT 0,
    "dismissals" INTEGER NOT NULL DEFAULT 0,
    "highestScore" INTEGER NOT NULL DEFAULT 0,
    "highestScoreNotOut" BOOLEAN NOT NULL DEFAULT false,
    "fifties" INTEGER NOT NULL DEFAULT 0,
    "hundreds" INTEGER NOT NULL DEFAULT 0,
    "legalBallsBowled" INTEGER NOT NULL DEFAULT 0,
    "maidens" INTEGER NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "bestBowlingWickets" INTEGER NOT NULL DEFAULT 0,
    "bestBowlingRuns" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "runOuts" INTEGER NOT NULL DEFAULT 0,
    "battingPoints" INTEGER NOT NULL DEFAULT 0,
    "bowlingPoints" INTEGER NOT NULL DEFAULT 0,
    "fieldingPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "playerOfMatchCount" INTEGER NOT NULL DEFAULT 0,
    "lastRebuiltAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_career_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popular_votes" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popular_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "kind" "LeaderboardKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "ballsProcessed" INTEGER NOT NULL DEFAULT 0,
    "triggeredBy" TEXT,
    "builtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "SponsorTier" NOT NULL DEFAULT 'PARTNER',
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "status" "SponsorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "clickUrl" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rotationWeight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_userId_key" ON "admin_profiles"("userId");

-- CreateIndex
CREATE INDEX "admin_profiles_role_idx" ON "admin_profiles"("role");

-- CreateIndex
CREATE INDEX "teams_deletedAt_idx" ON "teams"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_shortName_key" ON "teams"("shortName");

-- CreateIndex
CREATE INDEX "players_teamId_deletedAt_idx" ON "players"("teamId", "deletedAt");

-- CreateIndex
CREATE INDEX "players_deletedAt_idx" ON "players"("deletedAt");

-- CreateIndex
CREATE INDEX "player_team_history_playerId_idx" ON "player_team_history"("playerId");

-- CreateIndex
CREATE INDEX "player_team_history_teamId_idx" ON "player_team_history"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_tournamentId_label_key" ON "seasons"("tournamentId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_settings_seasonId_key" ON "tournament_settings"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "venues_name_location_key" ON "venues"("name", "location");

-- CreateIndex
CREATE INDEX "matches_status_scheduledAt_idx" ON "matches"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "matches_deletedAt_idx" ON "matches"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "matches_seasonId_matchNumber_key" ON "matches"("seasonId", "matchNumber");

-- CreateIndex
CREATE INDEX "match_teams_teamId_idx" ON "match_teams"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "match_teams_matchId_teamId_key" ON "match_teams"("matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "playing_xi_matchId_teamId_playerId_key" ON "playing_xi"("matchId", "teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "playing_xi_matchId_teamId_battingOrder_key" ON "playing_xi"("matchId", "teamId", "battingOrder");

-- CreateIndex
CREATE UNIQUE INDEX "innings_matchId_inningsNumber_key" ON "innings"("matchId", "inningsNumber");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_idempotencyKey_key" ON "deliveries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "deliveries_inningsId_overNumber_idx" ON "deliveries"("inningsId", "overNumber");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_inningsId_sequence_key" ON "deliveries"("inningsId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "wickets_deliveryId_key" ON "wickets"("deliveryId");

-- CreateIndex
CREATE INDEX "wickets_dismissedPlayerId_idx" ON "wickets"("dismissedPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "score_snapshots_matchId_key" ON "score_snapshots"("matchId");

-- CreateIndex
CREATE INDEX "player_match_batting_stats_playerId_idx" ON "player_match_batting_stats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_batting_stats_matchId_playerId_key" ON "player_match_batting_stats"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "player_match_bowling_stats_playerId_idx" ON "player_match_bowling_stats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_bowling_stats_matchId_playerId_key" ON "player_match_bowling_stats"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "player_career_stats_seasonId_totalPoints_idx" ON "player_career_stats"("seasonId", "totalPoints");

-- CreateIndex
CREATE UNIQUE INDEX "player_career_stats_playerId_seasonId_key" ON "player_career_stats"("playerId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "popular_votes_playerId_key" ON "popular_votes"("playerId");

-- CreateIndex
CREATE INDEX "leaderboard_snapshots_seasonId_kind_builtAt_idx" ON "leaderboard_snapshots"("seasonId", "kind", "builtAt");

-- CreateIndex
CREATE UNIQUE INDEX "sponsors_name_key" ON "sponsors"("name");

-- CreateIndex
CREATE INDEX "ad_creatives_placement_isActive_idx" ON "ad_creatives"("placement", "isActive");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_homeVenueId_fkey" FOREIGN KEY ("homeVenueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_team_history" ADD CONSTRAINT "player_team_history_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_team_history" ADD CONSTRAINT "player_team_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_settings" ADD CONSTRAINT "tournament_settings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tossWonByTeamId_fkey" FOREIGN KEY ("tossWonByTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_assignedScorerId_fkey" FOREIGN KEY ("assignedScorerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_playerOfMatchId_fkey" FOREIGN KEY ("playerOfMatchId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_teams" ADD CONSTRAINT "match_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playing_xi" ADD CONSTRAINT "playing_xi_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playing_xi" ADD CONSTRAINT "playing_xi_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playing_xi" ADD CONSTRAINT "playing_xi_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innings" ADD CONSTRAINT "innings_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innings" ADD CONSTRAINT "innings_battingTeamId_fkey" FOREIGN KEY ("battingTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "innings" ADD CONSTRAINT "innings_bowlingTeamId_fkey" FOREIGN KEY ("bowlingTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_inningsId_fkey" FOREIGN KEY ("inningsId") REFERENCES "innings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_bowlerId_fkey" FOREIGN KEY ("bowlerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_strikerId_fkey" FOREIGN KEY ("strikerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_nonStrikerId_fkey" FOREIGN KEY ("nonStrikerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wickets" ADD CONSTRAINT "wickets_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wickets" ADD CONSTRAINT "wickets_dismissedPlayerId_fkey" FOREIGN KEY ("dismissedPlayerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wickets" ADD CONSTRAINT "wickets_fielderId_fkey" FOREIGN KEY ("fielderId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wickets" ADD CONSTRAINT "wickets_assistFielderId_fkey" FOREIGN KEY ("assistFielderId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wickets" ADD CONSTRAINT "wickets_newBatterId_fkey" FOREIGN KEY ("newBatterId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_batting_stats" ADD CONSTRAINT "player_match_batting_stats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_batting_stats" ADD CONSTRAINT "player_match_batting_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_batting_stats" ADD CONSTRAINT "player_match_batting_stats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_bowling_stats" ADD CONSTRAINT "player_match_bowling_stats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_bowling_stats" ADD CONSTRAINT "player_match_bowling_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_bowling_stats" ADD CONSTRAINT "player_match_bowling_stats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_career_stats" ADD CONSTRAINT "player_career_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_career_stats" ADD CONSTRAINT "player_career_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "popular_votes" ADD CONSTRAINT "popular_votes_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "popular_votes" ADD CONSTRAINT "popular_votes_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
