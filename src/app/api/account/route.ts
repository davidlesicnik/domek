import { ZodError } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import {
  deleteAccount,
  getAccountSettings,
  parseDeleteAccountInput,
  parseUpdateAccountInput,
  updateAccountThemePreference,
} from "@/lib/account-settings";

function bearerToken(request: Request) {
  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function GET(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json(await getAccountSettings(session.user));
}

export async function PATCH(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = parseUpdateAccountInput(await request.json());
    const user = await updateAccountThemePreference(session.user.id, input);
    return Response.json({ user });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid account settings." }, { status: 400 });
    }

    console.error("[PATCH /api/account]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentAppSession(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    parseDeleteAccountInput(await request.json());
    const result = await deleteAccount(session.user, bearerToken(request));

    if (!result.ok) {
      const status = result.reason === "owner_with_members" ? 409 : 400;
      return Response.json({ error: result.reason }, { status });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid delete account request." }, { status: 400 });
    }

    console.error("[DELETE /api/account]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
