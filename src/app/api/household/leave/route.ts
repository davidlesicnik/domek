import { getCurrentAppSession } from "@/lib/authz";
import { leaveHousehold } from "@/lib/household-settings";

export async function POST(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await leaveHousehold(session.user);
    if (!result.ok) {
      const status =
        result.reason === "assigned_chores" ? 409 : result.reason === "owner_cannot_leave" ? 403 : 404;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[POST /api/household/leave]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
