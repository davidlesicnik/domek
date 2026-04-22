export type HouseholdMemberIdentity = Readonly<{
  accountEmail?: string | null;
  name?: string | null;
}>;

export function getHouseholdMemberName(
  member: HouseholdMemberIdentity,
  fallback = "Household member",
) {
  return member.name?.trim() || member.accountEmail?.trim() || fallback;
}

export function getHouseholdMemberSubtitle(member: HouseholdMemberIdentity) {
  return member.accountEmail?.trim() || null;
}
