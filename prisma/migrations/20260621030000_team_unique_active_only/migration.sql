-- Teams use soft delete (deletedAt) so completed-match scorecards keep
-- showing the original team name forever — deletion never renames or
-- erases that row. The plain unique indexes on name/shortName, however,
-- meant a deleted team's name stayed "reserved" forever too: creating a new
-- team or importing a CSV with that exact name crashed with a generic
-- unique-constraint error.
--
-- Fix: make uniqueness apply only to ACTIVE teams. A deleted team can never
-- block a new team (or CSV row) from using its old name/shortName again —
-- while the deleted row's own name/shortName stay untouched for history.
DROP INDEX "teams_name_key";
DROP INDEX "teams_shortName_key";

CREATE UNIQUE INDEX "teams_name_active_key" ON "teams"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "teams_shortName_active_key" ON "teams"("shortName") WHERE "deletedAt" IS NULL;
