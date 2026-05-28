import { getInvitePreview } from "@/lib/invites";

type RouteContext = Readonly<{
  params: Promise<{ token: string }>;
}>;

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const preview = await getInvitePreview(token);

  if (!preview || preview.status === "REVOKED" || preview.household.deletedAt) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (preview.status === "ACCEPTED") {
    return Response.json({ error: "already_used" }, { status: 409 });
  }

  if (preview.expiresAt < new Date()) {
    return Response.json({ error: "expired" }, { status: 410 });
  }

  return Response.json({
    invite: {
      householdName: preview.household.name,
      inviterName: preview.invitedBy.name,
    },
  });
}
