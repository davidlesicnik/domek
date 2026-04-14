import type { Provider } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getAppRuntimeConfig } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase";

const nextCookieName = "domek_next";
const allowedProviders = new Set<Provider>(["google", "github"]);

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/login") || value.startsWith("/auth/callback") || value.startsWith("/auth/start")) {
    return "/";
  }

  // Strip paths carrying an OAuth code — they can't be completed after a redirect
  if (value.includes("code=")) {
    return "/";
  }

  return value;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!allowedProviders.has(provider as Provider)) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const requestUrl = new URL(request.url);
  const { appUrl } = getAppRuntimeConfig();
  // Cloud Run terminates TLS at the load balancer, so request.url is http://.
  // Prefer APP_URL env var, then x-forwarded-proto, then request.url.
  const proto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const publicOrigin = appUrl ?? `${proto}://${requestUrl.host}`;
  const redirectTo = new URL("/auth/callback", publicOrigin).toString();
  const isSecure = proto === "https";
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
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
