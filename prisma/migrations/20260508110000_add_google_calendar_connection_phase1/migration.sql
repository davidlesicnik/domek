-- Google Calendar integration (Phase 1)
CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "googleUserId" VARCHAR(128) NOT NULL,
  "googleEmail" VARCHAR(320) NOT NULL,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "tokenScope" TEXT NOT NULL,
  "selectedCalendarId" VARCHAR(255),
  "selectedCalendarName" VARCHAR(255),
  "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncError" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_userId_key" ON "GoogleCalendarConnection"("userId");
CREATE INDEX "GoogleCalendarConnection_householdId_idx" ON "GoogleCalendarConnection"("householdId");
CREATE INDEX "GoogleCalendarConnection_syncEnabled_idx" ON "GoogleCalendarConnection"("syncEnabled");

ALTER TABLE "GoogleCalendarConnection"
ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoogleCalendarConnection"
ADD CONSTRAINT "GoogleCalendarConnection_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarEvent"
ADD COLUMN "sourceProvider" VARCHAR(40),
ADD COLUMN "sourceExternalId" VARCHAR(255),
ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);

CREATE INDEX "CalendarEvent_householdId_sourceProvider_idx" ON "CalendarEvent"("householdId", "sourceProvider");
CREATE UNIQUE INDEX "CalendarEvent_householdId_sourceProvider_sourceExternalId_key"
ON "CalendarEvent"("householdId", "sourceProvider", "sourceExternalId");

ALTER TABLE "Chore"
ADD COLUMN "sourceProvider" VARCHAR(40),
ADD COLUMN "sourceExternalId" VARCHAR(255),
ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Chore_householdId_sourceProvider_idx" ON "Chore"("householdId", "sourceProvider");
CREATE UNIQUE INDEX "Chore_householdId_sourceProvider_sourceExternalId_key"
ON "Chore"("householdId", "sourceProvider", "sourceExternalId");

ALTER TABLE "TodoItem"
ADD COLUMN "sourceProvider" VARCHAR(40),
ADD COLUMN "sourceExternalId" VARCHAR(255),
ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);

CREATE INDEX "TodoItem_todoListId_sourceProvider_idx" ON "TodoItem"("todoListId", "sourceProvider");
CREATE UNIQUE INDEX "TodoItem_todoListId_sourceProvider_sourceExternalId_key"
ON "TodoItem"("todoListId", "sourceProvider", "sourceExternalId");
