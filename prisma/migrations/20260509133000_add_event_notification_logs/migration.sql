-- AlterTable
ALTER TABLE "CalendarEvent"
ADD COLUMN "notificationOffsetMinutes" INTEGER;

-- CreateTable
CREATE TABLE "EventNotificationLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "scheduledForDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventNotificationLog_eventId_offsetMinutes_scheduledForDate_key"
ON "EventNotificationLog"("eventId", "offsetMinutes", "scheduledForDate");

-- CreateIndex
CREATE INDEX "CalendarEvent_notificationOffsetMinutes_idx"
ON "CalendarEvent"("notificationOffsetMinutes");

-- CreateIndex
CREATE INDEX "EventNotificationLog_eventId_idx"
ON "EventNotificationLog"("eventId");

-- AddForeignKey
ALTER TABLE "EventNotificationLog"
ADD CONSTRAINT "EventNotificationLog_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
