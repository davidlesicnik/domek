-- CreateEnum
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED');

-- CreateTable
CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL,
    "paddleCustomerId" TEXT,
    "paddleSubscriptionId" TEXT NOT NULL,
    "priceId" VARCHAR(64),
    "userId" TEXT NOT NULL,
    "householdId" TEXT,
    "startedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStartsAt" TIMESTAMP(3),
    "currentPeriodEndsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "lastEventOccurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_paddleCustomerId_key" ON "BillingSubscription"("paddleCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_paddleSubscriptionId_key" ON "BillingSubscription"("paddleSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_userId_key" ON "BillingSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_householdId_key" ON "BillingSubscription"("householdId");

-- CreateIndex
CREATE INDEX "BillingSubscription_householdId_idx" ON "BillingSubscription"("householdId");

-- CreateIndex
CREATE INDEX "BillingSubscription_status_idx" ON "BillingSubscription"("status");

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;
