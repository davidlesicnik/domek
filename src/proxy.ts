import createIntlMiddleware from "next-intl/middleware";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { billingStatusHasAccess } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { getSupabaseRuntimeConfig } from "@/lib/env";
import { localePrefixPattern, routing, stripLocalePrefix } from "@/i18n/routing";
import { upsertSupabaseUser } from "@/lib/users";

type CookieUpdate = Readonly<{
  name: string;
  value: string;
  options: CookieOptions;
}>;

const PUBLIC_PATHS = [
  "/",
  "/blog",
  "/contact",
  "/cookies",
  "/login",
  "/pricing",
  "/privacy",
  "/refund-policy",
  "/sitemap.xml",
  "/sw.js",
  "/manifest.webmanifest",
  "/terms",
  "/api/notify/send",
  "/api/paddle/webhook",
  "/auth/callback",
  "/auth/email",
  "/auth/start",
  "/api/auth/signout",
  "/api/integrations/google-calendar/callback",
  "/api/google-calendar/callback",
];

const NON_LOCALIZED_PATHS = [
  "/blog",
  "/sitemap.xml",
  "/sw.js",
  "/manifest.webmanifest",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isNonLocalizedPath(pathname: string): boolean {
  return NON_LOCALIZED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isOnboardingPath(pathname: string): boolean {
  return pathname === "/onboarding/household" || pathname.startsWith("/onboarding/household/");
}

function isPaymentPath(pathname: string): boolean {
  return pathname === "/onboarding/payment" || pathname.startsWith("/onboarding/payment/");
}

function isInvitePath(pathname: string): boolean {
  return pathname === "/invite" || pathname.startsWith("/invite/");
}

function isAuthFlowPath(pathname: string): boolean {
  return (
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/") ||
    pathname === "/auth/email" ||
    pathname.startsWith("/auth/email/") ||
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

async function authProxy(request: NextRequest, pathnameOverride?: string) {
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

  const pathname = pathnameOverride ?? request.nextUrl.pathname;

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
      householdId: true,
      household: {
        select: {
          billingSubscription: {
            select: {
              status: true,
            },
          },
        },
      },
    },
    where: { accountId: appUser.id, household: { deletedAt: null } },
  });

  if (membership) {
    const hasAccess =
      !!appUser.developmentAccessGrantedAt ||
      billingStatusHasAccess(membership.household.billingSubscription?.status);

    if (!hasAccess && !isPublicPath(pathname) && !isAuthFlowPath(pathname)) {
      if (!isPaymentPath(pathname)) {
        return redirectWithCookieUpdates(request, "/onboarding/payment", cookieUpdates, headerUpdates);
      }
    }

    if (hasAccess && (pathname === "/login" || isOnboardingPath(pathname) || isPaymentPath(pathname))) {
      return redirectWithCookieUpdates(request, "/app", cookieUpdates, headerUpdates);
    }

    return response;
  }

  if (!isPublicPath(pathname) && !isInvitePath(pathname) && !isAuthFlowPath(pathname)) {
    const billingSubscription = await prisma.billingSubscription.findUnique({
      select: { status: true },
      where: { userId: appUser.id },
    });
    const hasPreHouseholdAccess =
      !!appUser.developmentAccessGrantedAt || billingStatusHasAccess(billingSubscription?.status);

    if (hasPreHouseholdAccess) {
      if (!isOnboardingPath(pathname)) {
        return redirectWithCookieUpdates(request, "/onboarding/household", cookieUpdates, headerUpdates);
      }
    } else if (!isPaymentPath(pathname)) {
      return redirectWithCookieUpdates(request, "/onboarding/payment", cookieUpdates, headerUpdates);
    }
  }

  if (isPaymentPath(pathname) && appUser.developmentAccessGrantedAt) {
    return redirectWithCookieUpdates(request, "/onboarding/household", cookieUpdates, headerUpdates);
  }

  return response;
}

const intlMiddleware = createIntlMiddleware(routing);

function redirectLegacyEnglishLocale(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/en" && !pathname.startsWith("/en/")) return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname === "/en" ? "/en-US" : pathname.replace(/^\/en(?=\/)/, "/en-US");
  redirectUrl.search = search;

  return NextResponse.redirect(redirectUrl);
}

function prefixLocale(path: string, locale: string): string {
  if (!path.startsWith("/") || path.startsWith(`/${locale}/`) || path === `/${locale}`) {
    return path;
  }
  return `/${locale}${path}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyEnglishRedirect = redirectLegacyEnglishLocale(request);
  if (legacyEnglishRedirect) return legacyEnglishRedirect;

  // Skip intl for standalone public routes, API routes, auth route handlers, and Next.js internals
  if (
    isNonLocalizedPath(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/")
  ) {
    return authProxy(request);
  }

  const pathnameWithoutLocale = stripLocalePrefix(pathname);

  // Detect the current locale from the URL (for redirect prefixing)
  const localeMatch = pathname.match(localePrefixPattern);
  const currentLocale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // Run auth/billing checks against the locale-stripped path
  const proxyResponse = await authProxy(request, pathnameWithoutLocale);

  // If proxy issued a redirect, re-prefix the target with the locale
  if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
    const location = proxyResponse.headers.get("location");
    if (location) {
      const locationUrl = new URL(location, request.url);
      const localeStrippedPath = stripLocalePrefix(locationUrl.pathname);
      const prefixedPath = prefixLocale(localeStrippedPath, currentLocale);
      locationUrl.pathname = prefixedPath;

      const redirectResponse = NextResponse.redirect(locationUrl.toString(), {
        status: proxyResponse.status,
      });
      proxyResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      proxyResponse.headers.forEach((value, key) => {
        if (key !== "location" && key !== "set-cookie") {
          redirectResponse.headers.set(key, value);
        }
      });
      return redirectResponse;
    }
  }

  // Path permitted by proxy — run intl middleware to handle locale rewriting
  const intlResponse = intlMiddleware(request);
  proxyResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
