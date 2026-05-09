-- Refine notification schema created in 20260509123117.
ALTER TABLE "EventNotificationLog"
ALTER COLUMN "scheduledForDate" TYPE TIMESTAMP(3)
USING ("scheduledForDate"::date::timestamp(3));

CREATE INDEX "CalendarEvent_notificationOffsetMinutes_idx"
ON "CalendarEvent"("notificationOffsetMinutes");

CREATE INDEX "EventNotificationLog_eventId_idx"
ON "EventNotificationLog"("eventId");
