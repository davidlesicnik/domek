-- Store household invite tokens as one-way hashes and revoke legacy pending plaintext invites.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "HouseholdInvite"
ADD COLUMN "tokenHash" TEXT;

UPDATE "HouseholdInvite"
SET "status" = 'REVOKED'
WHERE "status" = 'PENDING';

UPDATE "HouseholdInvite"
SET "tokenHash" = encode(digest("token", 'sha256'), 'hex')
WHERE "tokenHash" IS NULL;

ALTER TABLE "HouseholdInvite"
ALTER COLUMN "tokenHash" SET NOT NULL;

DROP INDEX IF EXISTS "HouseholdInvite_token_idx";
DROP INDEX IF EXISTS "HouseholdInvite_token_key";

ALTER TABLE "HouseholdInvite"
DROP COLUMN "token";

CREATE UNIQUE INDEX "HouseholdInvite_tokenHash_key" ON "HouseholdInvite"("tokenHash");
