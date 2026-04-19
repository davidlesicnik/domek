import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { getSupabaseRuntimeConfig } from "@/lib/env";
import {
  applyRateLimitHeaders,
  checkRateLimit,
  getClientIpAddress,
  logRateLimitEvent,
  type RateLimitPolicy,
} from "@/lib/rate-limit";
import { getTrialState } from "@/lib/trial";
import { upsertSupabaseUser } from "@/lib/users";

type CookieUpdate = Readonly<{
  name: string;
  value: string;
  options: CookieOptions;
}>;


const AUTH_FLOW_RATE_LIMIT_POLICY: RateLimitPolicy = {
  burst: { limit: 10, windowMs: 60_000 },
  sustained: { limit: 100, windowMs: 3_600_000 },
};

const INVITE_RATE_LIMIT_POLICY: RateLimitPolicy = {
  burst: { limit: 20, windowMs: 60_000 },
  sustained: { limit: 200, windowMs: 3_600_000 },
};

const WRITE_API_RATE_LIMIT_POLICY: RateLimitPolicy = {
  burst: { limit: 40, windowMs: 60_000 },
  sustained: { limit: 400, windowMs: 3_600_000 },
};

const PUBLIC_PATHS = [
  "/",
  "/contact",
  "/cookies",
  "/login",
  "/pricing",
  "/privacy",
  "/terms",
  "/auth/callback",
  "/auth/start",
  "/api/auth/signout",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding/household" || pathname.startsWith("/onboarding/household/");
}

function isTrialEndedPath(pathname: string): boolean {
  return pathname === "/trial-ended" || pathname.startsWith("/trial-ended/");
}

function isInvitePath(pathname: string): boolean {
  return pathname === "/invite" || pathname.startsWith("/invite/");
}

function isAuthFlowPath(pathname: string): boolean {
  return (
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/") ||
    pathname === "/api/auth/signout" ||
    pathname === "/auth/start" ||
    pathname.startsWith("/auth/start/")
  );
}

function redirectWithCookieUpdates(
  request: NextRequest,
  pathname: string,
  cookieUpdates: CookieUpdate[],
  headerUpdates: Map<string, string>,
) {
  const response = NextResponse.redirect(new URL(pathname, request.url));

  cookieUpdates.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
  headerUpdates.forEach((value, key) => response.headers.set(key, value));

  return response;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const cookieUpdates: CookieUpdate[] = [];
  const headerUpdates = new Map<string, string>();
  const runtime = getSupabaseRuntimeConfig();

  const supabase = createServerClient(
    runtime.supabaseUrl,
    runtime.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookieUpdates.splice(0, cookieUpdates.length, ...cookiesToSet);
          Object.entries(headers).forEach(([key, value]) => headerUpdates.set(key, value));

          response = NextResponse.next({ request });
          cookieUpdates.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
          headerUpdates.forEach((value, key) => response.headers.set(key, value));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const ipAddress = getClientIpAddress(request.headers);
  const isWriteApiPath = pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method);

  if (pathname.startsWith("/auth/start/") || pathname === "/auth/callback") {
    const decision = checkRateLimit(
      { action: "auth-flow", ipAddress, pathname, userId: user?.id },
      AUTH_FLOW_RATE_LIMIT_POLICY,
    );

    if (!decision.allowed) {
      logRateLimitEvent({ action: "auth-flow", ipAddress, pathname, userId: user?.id }, decision, "proxy");
      const response = NextResponse.json(
        { error: "Too many authentication attempts. Please try again shortly." },
        { status: 429 },
      );
      applyRateLimitHeaders(response.headers, decision);
      return response;
    }

    applyRateLimitHeaders(response.headers, decision);
  }

  if (pathname === "/invite" || pathname.startsWith("/invite/")) {
    const decision = checkRateLimit(
      { action: "invite", ipAddress, pathname, userId: user?.id },
      INVITE_RATE_LIMIT_POLICY,
    );

    if (!decision.allowed) {
      logRateLimitEvent({ action: "invite", ipAddress, pathname, userId: user?.id }, decision, "proxy");
      const inviteResponse = NextResponse.json(
        { error: "Too many invite requests. Please wait before trying again." },
        { status: 429 },
      );
      applyRateLimitHeaders(inviteResponse.headers, decision);
      return inviteResponse;
    }

    applyRateLimitHeaders(response.headers, decision);
  }

  if (isWriteApiPath) {
    const decision = checkRateLimit(
      { action: "api-write", ipAddress, pathname, userId: user?.id },
      WRITE_API_RATE_LIMIT_POLICY,
    );

    if (!decision.allowed) {
      logRateLimitEvent({ action: "api-write", ipAddress, pathname, userId: user?.id }, decision, "proxy");
      const apiResponse = NextResponse.json(
        { error: "Too many write requests. Please wait and retry." },
        { status: 429 },
      );
      applyRateLimitHeaders(apiResponse.headers, decision);
      return apiResponse;
    }

    applyRateLimitHeaders(response.headers, decision);
  }

  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookieUpdates(request, `${loginUrl.pathname}${loginUrl.search}`, cookieUpdates, headerUpdates);
  }

  const { deletedAt, ...appUser } = await upsertSupabaseUser(user);

  if (deletedAt) {
    if (isPublicPath(pathname)) return response;
    return redirectWithCookieUpdates(request, "/login", cookieUpdates, headerUpdates);
  }

  const membership = await prisma.householdMember.findFirst({
    select: {
      id: true,
      household: { select: { createdAt: true, paidAt: true } },
    },
    where: { userId: appUser.id, household: { deletedAt: null } },
  });

  if (!membership && !isPublicPath(pathname) && !isInvitePath(pathname) && !isAuthFlowPath(pathname)) {
    if (!isOnboardingPath(pathname)) {
      return redirectWithCookieUpdates(request, "/onboarding/household", cookieUpdates, headerUpdates);
    }
  }

  if (membership) {
    const trialState = getTrialState(
      membership.household.createdAt,
      membership.household.paidAt,
      !!appUser.developmentAccessGrantedAt,
    );

    if (trialState === "expired") {
      if (!isTrialEndedPath(pathname) && !isPublicPath(pathname)) {
        return redirectWithCookieUpdates(request, "/trial-ended", cookieUpdates, headerUpdates);
      }
    } else {
      if (isTrialEndedPath(pathname)) {
        return redirectWithCookieUpdates(request, "/app", cookieUpdates, headerUpdates);
      }
      if (pathname === "/login" || isOnboardingPath(pathname)) {
        return redirectWithCookieUpdates(request, "/app", cookieUpdates, headerUpdates);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
