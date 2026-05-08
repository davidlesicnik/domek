import { getCurrentGoogleCalendarScope } from "@/lib/google-calendar/scope";
import { syncCalendarEventsToGoogle } from "@/lib/google-calendar-sync";

export async function POST() {
  const scope = await getCurrentGoogleCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncCalendarEventsToGoogle(scope.householdId);
    return Response.json({ summary });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not connected")) {
      return Response.json({ error: "Google Calendar is not connected." }, { status: 409 });
    }

    console.error("[POST /api/google-calendar/sync]", error);
    return Response.json({ error: "Unable to sync Google Calendar events." }, { status: 500 });
  }
}
