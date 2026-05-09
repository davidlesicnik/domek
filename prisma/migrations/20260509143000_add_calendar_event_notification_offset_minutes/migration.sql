ALTER TABLE "CalendarEvent"
ADD COLUMN "notificationOffsetMinutes" INTEGER;

CREATE INDEX "CalendarEvent_notificationOffsetMinutes_idx"
ON "CalendarEvent"("notificationOffsetMinutes");
