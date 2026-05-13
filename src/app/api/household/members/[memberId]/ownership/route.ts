import { getCurrentAppSession } from "@/lib/authz";
import { transferHouseholdOwnership } from "@/lib/household-settings";

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { memberId } = await context.params;
    const result = await transferHouseholdOwnership(session.user, memberId);
    if (!result.ok) {
      const status =
        result.reason === "member_not_found" ? 404 : result.reason === "forbidden" ? 403 : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[POST /api/household/members/[memberId]/ownership]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
