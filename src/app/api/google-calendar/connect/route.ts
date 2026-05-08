import { cookies } from "next/headers";

import { requireAppSession } from "@/lib/authz";
import { createGoogleOAuthState, createGoogleOAuthUrl, getOptionalGoogleOAuthConfig } from "@/lib/google-calendar";

const STATE_COOKIE = "google_calendar_oauth_state";

export async function GET(request: Request) {
  await requireAppSession();

  const origin = new URL(request.url).origin;

  if (!getOptionalGoogleOAuthConfig()) {
    return Response.redirect(new URL("/app/account?error=google_calendar_not_configured", origin));
  }

  const state = createGoogleOAuthState();
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: 60 * 10,
    name: STATE_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: state,
  });

  return Response.redirect(createGoogleOAuthUrl(state));
}
