import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthOrigin } from "@/lib/origin";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const requestGuard = validatePublicRouteRequest(request, "signout", {
    identifiers: user ? [user.id] : [],
  });

  if (!requestGuard.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await supabase.auth.signOut();

  const publicOrigin = resolveAuthOrigin(request);
  return NextResponse.redirect(new URL("/login", publicOrigin), { status: 303 });
}
