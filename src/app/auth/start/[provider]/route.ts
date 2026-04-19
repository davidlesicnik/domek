import type { Provider } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getAppRuntimeConfig } from "@/lib/env";
import { applyRateLimitHeaders, checkRateLimit, getClientIpAddress, logRateLimitEvent } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase";

const nextCookieName = "domek_next";
const allowedProviders = new Set<Provider>(["google", "github"]);

const AUTH_FLOW_ROUTE_RATE_LIMIT_POLICY = {
  burst: { limit: 8, windowMs: 60_000 },
  sustained: { limit: 80, windowMs: 3_600_000 },
};

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

  const requestUrl = new URL(request.url);
  const ipAddress = getClientIpAddress(request.headers);
  const rateLimitDecision = checkRateLimit(
    { action: "auth-flow", ipAddress, pathname: requestUrl.pathname },
    AUTH_FLOW_ROUTE_RATE_LIMIT_POLICY,
  );

  if (!rateLimitDecision.allowed) {
    logRateLimitEvent({ action: "auth-flow", ipAddress, pathname: requestUrl.pathname }, rateLimitDecision, "route");
    const response = NextResponse.json(
      { error: "Too many authentication attempts. Please try again shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(response.headers, rateLimitDecision);
    return response;
  }
  const { appUrl } = getAppRuntimeConfig();
  // Cloud Run terminates TLS at the load balancer, so request.url is http://.
  // Prefer APP_URL env var, then x-forwarded-proto + x-forwarded-host.
  const proto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const publicOrigin = appUrl ?? `${proto}://${host}`;

  if (!allowedProviders.has(provider as Provider)) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    applyRateLimitHeaders(response.headers, rateLimitDecision);
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = new URL("/auth/callback", publicOrigin).toString();
  const isSecure = proto === "https";
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: { redirectTo },
  });

  if (error || !data.url) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    applyRateLimitHeaders(response.headers, rateLimitDecision);
    return response;
  }

  const response = NextResponse.redirect(data.url);
  applyRateLimitHeaders(response.headers, rateLimitDecision);
  response.cookies.set(nextCookieName, nextPath, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  });

  return response;
}
