import { requireAppSession } from "@/lib/authz";
import { syncGoogleCalendarForUser } from "@/lib/google-calendar";
import { getFirstHouseholdMembership } from "@/lib/users";

export async function POST() {
  try {
    const session = await requireAppSession();
    const membership = await getFirstHouseholdMembership(session.user.id);

    if (!membership?.householdId) {
      return Response.json({ error: "No household found." }, { status: 400 });
    }

    const result = await syncGoogleCalendarForUser({
      householdId: membership.householdId,
      userId: session.user.id,
    });

    return Response.json({ imported: result.imported }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/google-calendar/sync]", error);
    return Response.json({ error: "Sync failed." }, { status: 500 });
  }
}
