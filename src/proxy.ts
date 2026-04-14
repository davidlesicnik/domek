import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { getSupabaseRuntimeConfig } from "@/lib/env";
import { upsertSupabaseUser } from "@/lib/users";

type CookieUpdate = Readonly<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/start", "/api/auth/signout"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding/household" || pathname.startsWith("/onboarding/household/");
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

  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithCookieUpdates(request, `${loginUrl.pathname}${loginUrl.search}`, cookieUpdates, headerUpdates);
  }

  const appUser = await upsertSupabaseUser(user);
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { userId: appUser.id },
  });

  if (!membership && !isOnboardingPath(pathname) && !isAuthFlowPath(pathname)) {
    return redirectWithCookieUpdates(request, "/onboarding/household", cookieUpdates, headerUpdates);
  }

  if (membership && (pathname === "/login" || isOnboardingPath(pathname))) {
    return redirectWithCookieUpdates(request, "/", cookieUpdates, headerUpdates);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
