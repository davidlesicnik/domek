-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncSource" TEXT,
ADD COLUMN     "syncStatus" TEXT;

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "googleEmail" TEXT,
    "googleAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_householdId_key" ON "GoogleCalendarConnection"("householdId");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_userId_idx" ON "GoogleCalendarConnection"("userId");

-- CreateIndex
CREATE INDEX "GoogleCalendarConnection_googleAccountId_idx" ON "GoogleCalendarConnection"("googleAccountId");

-- CreateIndex
CREATE INDEX "CalendarEvent_syncSource_idx" ON "CalendarEvent"("syncSource");

-- CreateIndex
CREATE INDEX "CalendarEvent_syncStatus_idx" ON "CalendarEvent"("syncStatus");

-- CreateIndex
CREATE INDEX "CalendarEvent_deletedAt_idx" ON "CalendarEvent"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_householdId_googleEventId_key" ON "CalendarEvent"("householdId", "googleEventId");

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

