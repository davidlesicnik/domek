import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthOrigin } from "@/lib/origin";
import { getGoogleCalendarConfig } from "@/lib/env";
import { createOAuthState } from "@/lib/google-calendar/oauth-state";
import { getCurrentGoogleCalendarScope } from "@/lib/google-calendar/scope";
import { stripLocalePrefix } from "@/i18n/routing";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const GOOGLE_OAUTH_AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/app";
  }

  const pathWithoutLocale = stripLocalePrefix(nextPath);
  const blocked = ["/api/google-calendar", "/auth", "/login"];

  if (blocked.some((prefix) => pathWithoutLocale.startsWith(prefix))) {
    return "/app";
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const config = getGoogleCalendarConfig();

  if (!config.enabled) {
    return Response.json({ error: "Google Calendar integration is disabled." }, { status: 404 });
  }

  if (!config.clientId) {
    return Response.json({ error: "Google Calendar OAuth is not configured." }, { status: 500 });
  }

  const scope = await getCurrentGoogleCalendarScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const publicOrigin = resolveAuthOrigin(request);
  const redirectUri =
    config.redirectUri ??
    new URL("/api/integrations/google-calendar/callback", publicOrigin).toString();
  const state = createOAuthState({
    householdId: scope.householdId,
    nextPath,
    userId: scope.userId,
  });

  const authUrl = new URL(GOOGLE_OAUTH_AUTHORIZE_ENDPOINT);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
