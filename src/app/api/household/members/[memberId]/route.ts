import { ZodError } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import {
  parseUpdateHouseholdMemberInput,
  removeHouseholdMember,
  updateHouseholdMember,
} from "@/lib/household-settings";

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { memberId } = await context.params;
    const input = parseUpdateHouseholdMemberInput(await request.json());
    const result = await updateHouseholdMember(session.user, memberId, input);
    if (!result.ok) {
      const status =
        result.reason === "forbidden" ? 403 : result.reason === "member_not_found" ? 404 : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid household member update." }, { status: 400 });
    }

    console.error("[PATCH /api/household/members/[memberId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { memberId } = await context.params;
    const result = await removeHouseholdMember(session.user, memberId);
    if (!result.ok) {
      const status =
        result.reason === "assigned_chores" ? 409 : result.reason === "forbidden" ? 403 : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/household/members/[memberId]]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
