-- Ensure no orphaned chores before tightening constraints
DELETE FROM "Chore" WHERE "assignedHouseholdMemberId" IS NULL;

-- DropForeignKey
ALTER TABLE "Chore" DROP CONSTRAINT "Chore_assignedHouseholdMemberId_fkey";

-- AlterTable
ALTER TABLE "Chore" ALTER COLUMN "assignedHouseholdMemberId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_assignedHouseholdMemberId_fkey" FOREIGN KEY ("assignedHouseholdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
