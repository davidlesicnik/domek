import { NextResponse, type NextRequest } from "next/server";

import { getGoogleCalendarConfig } from "@/lib/env";
import { upsertGoogleCalendarConnection } from "@/lib/google-calendar/connection";
import { getCurrentGoogleCalendarScope } from "@/lib/google-calendar/scope";
import { verifyOAuthState } from "@/lib/google-calendar/oauth-state";
import { resolveAuthOrigin } from "@/lib/origin";

function failureRedirect(request: NextRequest, code: string) {
  const publicOrigin = resolveAuthOrigin(request);
  return NextResponse.redirect(new URL(`/app?googleCalendar=${code}`, publicOrigin));
}

export async function GET(request: NextRequest) {
  const config = getGoogleCalendarConfig();

  if (!config.enabled) {
    return failureRedirect(request, "disabled");
  }

  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");

  if (oauthError) {
    return failureRedirect(request, "oauth_error");
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  if (!code || !state) {
    return failureRedirect(request, "invalid_callback");
  }

  const scope = await getCurrentGoogleCalendarScope();

  if (!scope) {
    return failureRedirect(request, "unauthorized");
  }

  let parsedState: ReturnType<typeof verifyOAuthState>;

  try {
    parsedState = verifyOAuthState(state);
  } catch {
    return failureRedirect(request, "state_invalid");
  }

  if (parsedState.userId !== scope.userId || parsedState.householdId !== scope.householdId) {
    return failureRedirect(request, "state_mismatch");
  }

  const publicOrigin = resolveAuthOrigin(request);
  const redirectUri =
    config.redirectUri ??
    new URL("/api/integrations/google-calendar/callback", publicOrigin).toString();

  try {
    await upsertGoogleCalendarConnection({
      code,
      householdId: scope.householdId,
      redirectUri,
      userId: scope.userId,
    });
  } catch (error) {
    console.error("[GET /api/integrations/google-calendar/callback]", error);
    return failureRedirect(request, "connect_failed");
  }

  const destination = new URL(parsedState.nextPath, publicOrigin);
  destination.searchParams.set("googleCalendar", "connected");
  return NextResponse.redirect(destination);
}
