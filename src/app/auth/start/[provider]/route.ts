import type { Provider } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { sanitizeAuthStartNextPath } from "@/lib/auth-redirect";
import { resolveAuthOrigin } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase";

const nextCookieName = "domek_next";
const allowedProviders = new Set<Provider>(["google"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const requestUrl = new URL(request.url);
  const publicOrigin = resolveAuthOrigin(request);

  if (!allowedProviders.has(provider as Provider)) {
    return NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = new URL("/auth/callback", publicOrigin).toString();
  const isSecure = new URL(publicOrigin).protocol === "https:";
  const nextPath = sanitizeAuthStartNextPath(requestUrl.searchParams.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(nextCookieName, nextPath, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  });

  return response;
}
