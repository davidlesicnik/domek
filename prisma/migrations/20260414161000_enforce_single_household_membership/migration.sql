-- Until Domek has an explicit household switcher, one authenticated user maps to one household.
CREATE UNIQUE INDEX "HouseholdMember_userId_key" ON "HouseholdMember"("userId");
