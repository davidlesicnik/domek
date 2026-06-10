import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

import { invalidateSession, readSessionToken } from "@/lib/auth/sessions";
import { resolveAuthOriginSafely } from "@/lib/auth/route-utils";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";

export async function POST(request: NextRequest) {
  const token = await readSessionToken(request);
  const requestGuard = validatePublicRouteRequest(request, "signout", {
    identifiers: token ? [token] : [],
  });

  if (!requestGuard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const publicOrigin = resolveAuthOriginSafely(request);
  const response = NextResponse.redirect(new URL("/login", publicOrigin), { status: 303 });
  await invalidateSession(token, response);
  return response;
}
