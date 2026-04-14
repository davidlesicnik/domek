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
  const baseUrl = appUrl ?? request.url;
  const redirectTo = new URL("/auth/callback", baseUrl).toString();
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
    secure: requestUrl.protocol === "https:",
  });

  return response;
}
