import { ZodError } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import {
  deleteHousehold,
  getCurrentHouseholdSettings,
  parseConfirmInput,
  parseRenameHouseholdInput,
  renameHousehold,
} from "@/lib/household-settings";

export async function GET(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const household = await getCurrentHouseholdSettings(session.user);
  if (!household) {
    return Response.json({ error: "Household not found." }, { status: 404 });
  }

  return Response.json(household);
}

export async function PATCH(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseRenameHouseholdInput(await request.json());
    const result = await renameHousehold(session.user, input);
    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: 403 });
    }

    return Response.json({ household: result.household });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid household settings." }, { status: 400 });
    }

    console.error("[PATCH /api/household]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    parseConfirmInput(await request.json());
    const result = await deleteHousehold(session.user);
    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: 403 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid delete household request." }, { status: 400 });
    }

    console.error("[DELETE /api/household]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
