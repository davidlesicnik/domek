-- Drop Auth.js adapter state. Local data is disposable for this refactor.
DROP TABLE IF EXISTS "VerificationToken";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "Account";

ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
