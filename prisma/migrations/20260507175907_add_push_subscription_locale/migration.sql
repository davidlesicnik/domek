-- AlterTable
ALTER TABLE "PushSubscription"
ADD COLUMN "locale" VARCHAR(5) NOT NULL DEFAULT 'en';
