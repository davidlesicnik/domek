import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthOrigin } from "@/lib/origin";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const requestGuard = validatePublicRouteRequest(request, "signout");

  if (!requestGuard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const publicOrigin = resolveAuthOrigin(request);
  return NextResponse.redirect(new URL("/login", publicOrigin), { status: 303 });
}
