import { getCurrentAppSession } from "@/lib/authz";
import { getFirstHouseholdMembership } from "@/lib/users";

export type GoogleCalendarScope = Readonly<{
  householdId: string;
  userId: string;
}>;

export async function getCurrentGoogleCalendarScope(): Promise<GoogleCalendarScope | null> {
  const session = await getCurrentAppSession();

  if (!session) {
    return null;
  }

  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership?.householdId) {
    return null;
  }

  return {
    householdId: membership.householdId,
    userId: session.user.id,
  };
}
