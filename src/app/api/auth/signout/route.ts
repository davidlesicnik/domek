import { NextResponse, type NextRequest } from "next/server";

import { resolveAuthOrigin } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const publicOrigin = resolveAuthOrigin(request);
  return NextResponse.redirect(new URL("/login", publicOrigin));
}
