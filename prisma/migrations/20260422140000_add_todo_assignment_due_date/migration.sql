-- AlterTable
ALTER TABLE "TodoItem"
  ADD COLUMN "assignedHouseholdMemberId" TEXT,
  ADD COLUMN "dueDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TodoItem_assignedHouseholdMemberId_idx" ON "TodoItem"("assignedHouseholdMemberId");

-- CreateIndex
CREATE INDEX "TodoItem_dueDate_idx" ON "TodoItem"("dueDate");

-- AddForeignKey
ALTER TABLE "TodoItem"
  ADD CONSTRAINT "TodoItem_assignedHouseholdMemberId_fkey"
  FOREIGN KEY ("assignedHouseholdMemberId") REFERENCES "HouseholdMember"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
