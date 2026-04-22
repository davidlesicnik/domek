ALTER TABLE "HouseholdMember"
  ADD COLUMN "accountId" TEXT,
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "name" VARCHAR(120);

UPDATE "HouseholdMember" AS hm
SET
  "accountId" = hm."userId",
  "createdByUserId" = hm."userId",
  "name" = COALESCE(NULLIF(BTRIM(u."name"), ''), NULLIF(BTRIM(u."email"), ''), 'Household member')
FROM "User" AS u
WHERE u."id" = hm."userId";

ALTER TABLE "HouseholdMember"
  ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "HouseholdMember"
  ADD CONSTRAINT "HouseholdMember_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "HouseholdMember_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "HouseholdMember_accountId_key" ON "HouseholdMember"("accountId");
CREATE INDEX "HouseholdMember_createdByUserId_idx" ON "HouseholdMember"("createdByUserId");

DROP INDEX "HouseholdMember_userId_householdId_key";
DROP INDEX "HouseholdMember_userId_key";

ALTER TABLE "HouseholdMember"
  DROP CONSTRAINT "HouseholdMember_userId_fkey";

ALTER TABLE "HouseholdMember"
  DROP COLUMN "userId";
