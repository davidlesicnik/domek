import { ZodError } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import { parseSendHouseholdInviteInput, sendHouseholdInvite } from "@/lib/household-settings";

export async function POST(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseSendHouseholdInviteInput(await request.json());
    const result = await sendHouseholdInvite(session.user, input);
    if (!result.ok) {
      const status =
        result.reason === "forbidden"
          ? 403
          : result.reason === "already_in_household" || result.reason === "account_already_linked"
            ? 409
            : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ invite: result.invite }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid invite." }, { status: 400 });
    }

    console.error("[POST /api/household/invites]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
