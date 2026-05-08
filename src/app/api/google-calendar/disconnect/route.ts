import { requireAppSession } from "@/lib/authz";
import { disconnectGoogleCalendarConnection } from "@/lib/google-calendar";

export async function POST() {
  try {
    const session = await requireAppSession();
    await disconnectGoogleCalendarConnection(session.user.id);
    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/google-calendar/disconnect]", error);
    return Response.json({ error: "Disconnect failed." }, { status: 500 });
  }
}
