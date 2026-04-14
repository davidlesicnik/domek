-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL, -- NOSONAR: PostgreSQL uses VARCHAR; VARCHAR2 is Oracle-specific.
    "householdId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL, -- NOSONAR: PostgreSQL uses VARCHAR; VARCHAR2 is Oracle-specific.
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" VARCHAR(1000), -- NOSONAR: PostgreSQL uses VARCHAR; VARCHAR2 is Oracle-specific.
    "householdMemberId" TEXT,
    "categoryId" TEXT,
    "householdId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseCategory_householdId_idx" ON "ExpenseCategory"("householdId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_createdByUserId_idx" ON "ExpenseCategory"("createdByUserId");

-- CreateIndex
CREATE INDEX "Expense_householdId_idx" ON "Expense"("householdId");

-- CreateIndex
CREATE INDEX "Expense_householdId_date_idx" ON "Expense"("householdId", "date");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_createdByUserId_idx" ON "Expense"("createdByUserId");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_householdMemberId_fkey" FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
