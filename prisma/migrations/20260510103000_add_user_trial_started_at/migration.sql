ALTER TABLE "User"
ADD COLUMN "trialStartedAt" TIMESTAMP(3);

UPDATE "User" AS u
SET "trialStartedAt" = u."createdAt"
WHERE u."trialStartedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "BillingSubscription" AS bs
    WHERE bs."userId" = u."id"
  );
