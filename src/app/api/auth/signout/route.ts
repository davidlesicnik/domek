import { NextResponse, type NextRequest } from "next/server";

import { invalidateSession, readSessionToken } from "@/lib/auth/sessions";
import { resolveAuthOrigin } from "@/lib/origin";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";

export async function POST(request: NextRequest) {
  const token = await readSessionToken(request);
  const requestGuard = validatePublicRouteRequest(request, "signout", {
    identifiers: token ? [token] : [],
  });

  if (!requestGuard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await invalidateSession(token);

  const publicOrigin = resolveAuthOrigin(request);
  return NextResponse.redirect(new URL("/login", publicOrigin), { status: 303 });
}
