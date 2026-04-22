ALTER TABLE "HouseholdInvite"
  ADD COLUMN "householdMemberId" TEXT;

ALTER TABLE "HouseholdInvite"
  ADD CONSTRAINT "HouseholdInvite_householdMemberId_fkey"
    FOREIGN KEY ("householdMemberId") REFERENCES "HouseholdMember"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "HouseholdInvite_householdMemberId_idx"
  ON "HouseholdInvite"("householdMemberId");
