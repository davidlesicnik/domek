import {
  deleteAccount,
  getAccountSettings,
  parseDeleteAccountInput,
  parseUpdateAccountInput,
  updateAccountThemePreference,
} from "@/lib/account-settings";
import { handleRouteError, jsonError, requireApiSession } from "@/lib/api-route";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  return Response.json(await getAccountSettings(session.user));
}

export async function PATCH(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  try {
    const input = parseUpdateAccountInput(await request.json());
    const user = await updateAccountThemePreference(session.user.id, input);
    return Response.json({ user });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid account settings.",
      logLabel: "[PATCH /api/account]",
    });
  }
}

export async function DELETE(request: Request) {
  const session = await requireApiSession(request);
  if (session instanceof Response) return session;

  try {
    parseDeleteAccountInput(await request.json());
    const result = await deleteAccount(session.user);

    if (!result.ok) {
      const status = result.reason === "owner_with_members" ? 409 : 400;
      return jsonError(result.reason, status);
    }

    return Response.json({ success: true });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid delete account request.",
      logLabel: "[DELETE /api/account]",
    });
  }
}
