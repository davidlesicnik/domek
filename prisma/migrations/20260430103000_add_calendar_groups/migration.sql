-- CreateTable
CREATE TABLE "CalendarGroup" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarGroup_householdId_name_key" ON "CalendarGroup"("householdId", "name");

-- CreateIndex
CREATE INDEX "CalendarGroup_householdId_idx" ON "CalendarGroup"("householdId");

-- CreateIndex
CREATE INDEX "CalendarGroup_createdByUserId_idx" ON "CalendarGroup"("createdByUserId");

-- AddColumn
ALTER TABLE "CalendarEvent" ADD COLUMN "groupId" TEXT;

-- Backfill groups from the legacy hardcoded calendar categories.
INSERT INTO "CalendarGroup" ("id", "name", "color", "householdId", "createdByUserId", "createdAt", "updatedAt")
SELECT
    md5(concat('CalendarGroup:', "householdId", ':', "category"))::text,
    CASE "category"
        WHEN 'CARE' THEN 'Care'
        WHEN 'GUESTS' THEN 'Guests'
        WHEN 'HOME' THEN 'Home'
        WHEN 'SCHOOL' THEN 'School'
    END,
    CASE "category"
        WHEN 'CARE' THEN '#6e9274'
        WHEN 'GUESTS' THEN '#5f7fa3'
        WHEN 'HOME' THEN '#d4bf50'
        WHEN 'SCHOOL' THEN '#b86f7a'
    END,
    "householdId",
    MIN("createdByUserId"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "CalendarEvent"
WHERE "householdId" IS NOT NULL
GROUP BY "householdId", "category";

UPDATE "CalendarEvent" AS "event"
SET "groupId" = "group"."id"
FROM "CalendarGroup" AS "group"
WHERE "group"."householdId" = "event"."householdId"
  AND "group"."name" = CASE "event"."category"
    WHEN 'CARE' THEN 'Care'
    WHEN 'GUESTS' THEN 'Guests'
    WHEN 'HOME' THEN 'Home'
    WHEN 'SCHOOL' THEN 'School'
  END;

ALTER TABLE "CalendarEvent" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "CalendarEvent_groupId_idx" ON "CalendarEvent"("groupId");

-- AddForeignKey
ALTER TABLE "CalendarGroup" ADD CONSTRAINT "CalendarGroup_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarGroup" ADD CONSTRAINT "CalendarGroup_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CalendarGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnum
DROP TYPE "CalendarEventCategory";
