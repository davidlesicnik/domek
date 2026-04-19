import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { applyRateLimitHeaders, checkRateLimit, getClientIpAddress, logRateLimitEvent } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase";
import { upsertSupabaseUser } from "@/lib/users";

const nextCookieName = "domek_next";

const AUTH_CALLBACK_RATE_LIMIT_POLICY = {
  burst: { limit: 10, windowMs: 60_000 },
  sustained: { limit: 120, windowMs: 3_600_000 },
};

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  if (value.startsWith("/login") || value.startsWith("/auth/callback")) {
    return "/app";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const ipAddress = getClientIpAddress(request.headers);
  const rateLimitDecision = checkRateLimit(
    { action: "auth-callback", ipAddress, pathname: requestUrl.pathname },
    AUTH_CALLBACK_RATE_LIMIT_POLICY,
  );

  if (!rateLimitDecision.allowed) {
    logRateLimitEvent({ action: "auth-callback", ipAddress, pathname: requestUrl.pathname }, rateLimitDecision, "route");
    const blocked = NextResponse.json(
      { error: "Too many authentication callbacks. Please retry shortly." },
      { status: 429 },
    );
    applyRateLimitHeaders(blocked.headers, rateLimitDecision);
    return blocked;
  }
  const proto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const publicOrigin = `${proto}://${host}`;

  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(request.cookies.get(nextCookieName)?.value);

  if (!code) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    response.cookies.delete(nextCookieName);
    applyRateLimitHeaders(response.headers, rateLimitDecision);
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    response.cookies.delete(nextCookieName);
    applyRateLimitHeaders(response.headers, rateLimitDecision);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    response.cookies.delete(nextCookieName);
    applyRateLimitHeaders(response.headers, rateLimitDecision);
    return response;
  }

  const appUser = await upsertSupabaseUser(user);
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { userId: appUser.id, household: { deletedAt: null } },
  });

  const isInviteNext = next.startsWith("/invite/");
  const destination = membership
    ? next
    : isInviteNext
      ? next
      : appUser.developmentAccessGrantedAt
        ? "/onboarding/household"
        : "/onboarding/payment";
  const response = NextResponse.redirect(new URL(destination, publicOrigin));
  response.cookies.delete(nextCookieName);
  applyRateLimitHeaders(response.headers, rateLimitDecision);
  return response;
}
