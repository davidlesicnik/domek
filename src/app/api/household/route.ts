import { handleRouteError, jsonError, requireApiSession } from "@/lib/api-route";
import {
  deleteHousehold,
  getCurrentHouseholdSettings,
  parseConfirmInput,
  parseRenameHouseholdInput,
  renameHousehold,
} from "@/lib/household-settings";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  const household = await getCurrentHouseholdSettings(session.user);
  if (!household) {
    return jsonError("Household not found.", 404);
  }

  return Response.json(household);
}

export async function PATCH(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  try {
    const input = parseRenameHouseholdInput(await request.json());
    const result = await renameHousehold(session.user, input);
    if (!result.ok) {
      return jsonError(result.reason, 403);
    }

    return Response.json({ household: result.household });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid household settings.",
      logLabel: "[PATCH /api/household]",
    });
  }
}

export async function DELETE(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  try {
    parseConfirmInput(await request.json());
    const result = await deleteHousehold(session.user);
    if (!result.ok) {
      return jsonError(result.reason, 403);
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid delete household request.",
      logLabel: "[DELETE /api/household]",
    });
  }
}
