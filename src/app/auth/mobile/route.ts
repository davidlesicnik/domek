import { NextResponse, type NextRequest } from "next/server";

import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { resolveAuthOrigin } from "@/lib/origin";

const nextCookieName = "domek_next";

export async function GET(request: NextRequest) {
  const publicOrigin = resolveAuthOrigin(request);
  const requestUrl = new URL(request.url);
  const nextPath = sanitizeAuthCallbackNextPath(
    requestUrl.searchParams.get("next"),
  );
  const callbackUrl = new URL("/auth/callback", publicOrigin);

  requestUrl.searchParams.forEach((value, key) => {
    if (key == "next") {
      return;
    }

    callbackUrl.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(callbackUrl);
  response.cookies.set(nextCookieName, nextPath, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: callbackUrl.protocol == "https:",
  });

  return response;
}
