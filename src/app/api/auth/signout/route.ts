import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  return NextResponse.redirect(new URL("/login", `${proto}://${host}`));
}
