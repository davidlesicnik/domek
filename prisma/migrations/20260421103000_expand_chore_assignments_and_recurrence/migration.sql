-- CreateEnum
CREATE TYPE "ChoreAssignmentType" AS ENUM ('UNASSIGNED', 'FIXED', 'ROTATING');

-- CreateEnum
CREATE TYPE "ChoreRecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- DropForeignKey
ALTER TABLE "Chore" DROP CONSTRAINT "Chore_assignedHouseholdMemberId_fkey";

-- AlterTable
ALTER TABLE "Chore"
  ADD COLUMN "assignmentType" "ChoreAssignmentType" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "recurrenceType" "ChoreRecurrenceType" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN "rotationIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rotationMemberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "weeklyDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "Chore"
  ALTER COLUMN "assignedHouseholdMemberId" DROP NOT NULL;

UPDATE "Chore"
SET
  "assignmentType" = 'FIXED',
  "recurrenceType" = 'CUSTOM',
  "rotationMemberIds" = ARRAY[]::TEXT[],
  "weeklyDays" = ARRAY[]::INTEGER[],
  "rotationIndex" = 0;

ALTER TABLE "Chore"
  ALTER COLUMN "rotationMemberIds" SET NOT NULL,
  ALTER COLUMN "weeklyDays" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_assignedHouseholdMemberId_fkey"
FOREIGN KEY ("assignedHouseholdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
