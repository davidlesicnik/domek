CREATE TABLE "ChoreCategory" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Chore"
  ADD COLUMN "categoryId" TEXT;

CREATE UNIQUE INDEX "ChoreCategory_householdId_name_key" ON "ChoreCategory"("householdId", "name");
CREATE INDEX "ChoreCategory_householdId_idx" ON "ChoreCategory"("householdId");
CREATE INDEX "ChoreCategory_createdByUserId_idx" ON "ChoreCategory"("createdByUserId");
CREATE INDEX "Chore_categoryId_idx" ON "Chore"("categoryId");

ALTER TABLE "ChoreCategory" ADD CONSTRAINT "ChoreCategory_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChoreCategory" ADD CONSTRAINT "ChoreCategory_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Chore" ADD CONSTRAINT "Chore_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "ChoreCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
