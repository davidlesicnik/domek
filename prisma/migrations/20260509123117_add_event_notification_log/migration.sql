-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "notificationOffsetMinutes" INTEGER;

-- CreateTable
CREATE TABLE "EventNotificationLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "offsetMinutes" INTEGER NOT NULL,
    "scheduledForDate" VARCHAR(10) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventNotificationLog_scheduledForDate_idx" ON "EventNotificationLog"("scheduledForDate");

-- CreateIndex
CREATE UNIQUE INDEX "EventNotificationLog_eventId_offsetMinutes_scheduledForDate_key" ON "EventNotificationLog"("eventId", "offsetMinutes", "scheduledForDate");

-- AddForeignKey
ALTER TABLE "EventNotificationLog" ADD CONSTRAINT "EventNotificationLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
