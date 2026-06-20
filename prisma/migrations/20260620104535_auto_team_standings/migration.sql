-- Convert TeamStanding's manual-only points/netRunRate into an
-- auto-computed value (kept fresh by the leaderboard engine on every
-- match completion) plus an optional admin override.
ALTER TABLE "team_standings" RENAME COLUMN "points" TO "autoPoints";
ALTER TABLE "team_standings" RENAME COLUMN "netRunRate" TO "autoNetRunRate";
ALTER TABLE "team_standings" ALTER COLUMN "autoNetRunRate" DROP NOT NULL;
ALTER TABLE "team_standings" ALTER COLUMN "autoNetRunRate" DROP DEFAULT;
ALTER TABLE "team_standings" ADD COLUMN "pointsOverride" INTEGER;
ALTER TABLE "team_standings" ADD COLUMN "nrrOverride" DOUBLE PRECISION;

-- Any rows entered under the old all-manual workflow predate automatic
-- calculation and don't reflect real results — clear them so the next
-- leaderboard rebuild (triggered right after this migration) fills in the
-- correct auto values instead of leaving stale manual numbers in place.
UPDATE "team_standings" SET "autoPoints" = 0, "autoNetRunRate" = NULL;
