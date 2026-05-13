import { ZodError } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import {
  createPassiveHouseholdMember,
  parseCreatePassiveHouseholdMemberInput,
} from "@/lib/household-settings";

export async function POST(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseCreatePassiveHouseholdMemberInput(await request.json());
    const result = await createPassiveHouseholdMember(session.user, input);
    if (!result.ok) {
      const status = result.reason === "forbidden" ? 403 : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ member: result.member }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid household member." }, { status: 400 });
    }

    console.error("[POST /api/household/members]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
