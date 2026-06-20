-- Same fix as teams_name_active_key: a deleted match's matchNumber stayed
-- "reserved" forever under the plain unique index, blocking a new match
-- from reusing that number within the season. Make it unique only among
-- ACTIVE matches — a deleted match keeps its own matchNumber for history,
-- but never blocks a new fixture from using that number again.
DROP INDEX "matches_seasonId_matchNumber_key";

CREATE UNIQUE INDEX "matches_seasonId_matchNumber_active_key" ON "matches"("seasonId", "matchNumber") WHERE "deletedAt" IS NULL;
