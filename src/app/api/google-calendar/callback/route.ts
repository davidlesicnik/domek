import { cookies } from "next/headers";

import { requireAppSession } from "@/lib/authz";
import { exchangeGoogleCodeForTokens, fetchGoogleUserInfo, saveGoogleCalendarConnection } from "@/lib/google-calendar";
import { isGoogleCalendarEnabled } from "@/lib/env";
import { getFirstHouseholdMembership } from "@/lib/users";

const STATE_COOKIE = "google_calendar_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isGoogleCalendarEnabled()) {
    return Response.redirect(new URL("/app/account?error=google_calendar_not_configured", url.origin));
  }

  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);

  if (!state || !expectedState || state !== expectedState || !code) {
    return Response.redirect(new URL("/app/account?error=google_calendar_oauth_failed", url.origin));
  }

  try {
    const session = await requireAppSession();
    const membership = await getFirstHouseholdMembership(session.user.id);

    if (!membership?.householdId) {
      return Response.redirect(new URL("/app/account?error=google_calendar_no_household", url.origin));
    }

    const token = await exchangeGoogleCodeForTokens(code);
    const userInfo = await fetchGoogleUserInfo(token.access_token);

    await saveGoogleCalendarConnection({
      householdId: membership.householdId,
      tokens: token,
      userId: session.user.id,
      userInfo,
    });

    return Response.redirect(new URL("/app/account?googleCalendar=connected", url.origin));
  } catch (error) {
    console.error("[GET /api/google-calendar/callback]", error);
    return Response.redirect(new URL("/app/account?error=google_calendar_oauth_failed", url.origin));
  }
}
