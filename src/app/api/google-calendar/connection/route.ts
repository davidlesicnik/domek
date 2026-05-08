import { deleteGoogleCalendarConnection, getGoogleCalendarConnection, isGoogleCalendarEnabled } from "@/lib/google-calendar/connection";
import { getCurrentGoogleCalendarScope } from "@/lib/google-calendar/scope";

export async function GET() {
  if (!isGoogleCalendarEnabled()) {
    return Response.json({ enabled: false });
  }

  const scope = await getCurrentGoogleCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getGoogleCalendarConnection(scope.householdId);

  if (!connection) {
    return Response.json({ connected: false, enabled: true });
  }

  return Response.json({
    connected: true,
    connection: {
      createdAt: connection.createdAt.toISOString(),
      googleEmail: connection.googleEmail,
      id: connection.id,
      scope: connection.scope,
      tokenExpiresAt: connection.tokenExpiresAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      userId: connection.userId,
    },
    enabled: true,
  });
}

export async function DELETE() {
  if (!isGoogleCalendarEnabled()) {
    return Response.json({ enabled: false });
  }

  const scope = await getCurrentGoogleCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteGoogleCalendarConnection(scope.householdId);
  return Response.json({ connected: false, enabled: true });
}
