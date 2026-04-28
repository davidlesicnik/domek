-- CreateTable
CREATE TABLE "ExpenseSplit" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "householdMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_householdMemberId_key" ON "ExpenseSplit"("expenseId", "householdMemberId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_expenseId_idx" ON "ExpenseSplit"("expenseId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_householdId_idx" ON "ExpenseSplit"("householdId");

-- CreateIndex
CREATE INDEX "ExpenseSplit_householdMemberId_idx" ON "ExpenseSplit"("householdMemberId");

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_householdMemberId_fkey" FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
