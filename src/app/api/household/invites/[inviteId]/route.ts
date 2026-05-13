import { getCurrentAppSession } from "@/lib/authz";
import { revokeHouseholdInvite } from "@/lib/household-settings";

type RouteContext = {
  params: Promise<{ inviteId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { inviteId } = await context.params;
    const result = await revokeHouseholdInvite(session.user, inviteId);
    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: 403 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/household/invites/[inviteId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
