-- CreateEnum
CREATE TYPE "StandingStatus" AS ENUM ('NONE', 'QUALIFIED', 'ELIMINATED');

-- CreateTable
CREATE TABLE "team_standings" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 0,
    "netRunRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StandingStatus" NOT NULL DEFAULT 'NONE',
    "sortHint" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "team_standings_seasonId_idx" ON "team_standings"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "team_standings_seasonId_teamId_key" ON "team_standings"("seasonId", "teamId");

-- AddForeignKey
ALTER TABLE "team_standings" ADD CONSTRAINT "team_standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_standings" ADD CONSTRAINT "team_standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
