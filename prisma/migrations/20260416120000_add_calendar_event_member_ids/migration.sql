ALTER TABLE "CalendarEvent" ADD COLUMN "householdMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CalendarEvent" DROP COLUMN "people";
