import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing, localePrefixPattern, stripLocalePrefix } from "@/i18n/routing";
import { getCurrentAppSession } from "@/lib/authz";
import { hasHouseholdMembership } from "@/lib/users";

const PUBLIC_PATHS = [
  "/",
  "/account-deletion",
  "/blog",
  "/contact",
  "/cookies",
  "/forgot-password",
  "/login",
  "/manifest.webmanifest",
  "/pricing",
  "/privacy",
  "/refund-policy",
  "/register",
  "/reset-password",
  "/sitemap.xml",
  "/sw.js",
  "/terms",
  "/api/account",
  "/api/chores",
  "/api/dashboard",
  "/api/calendar",
  "/api/expenses",
  "/api/household",
  "/api/invite",
  "/api/notes",
  "/api/notify/send",
  "/api/shopping",
  "/api/todos",
  "/api/auth/signout",
];

const NON_LOCALIZED_PATHS = [
  "/blog",
  "/manifest.webmanifest",
  "/sitemap.xml",
  "/sw.js",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isNonLocalizedPath(pathname: string) {
  return NON_LOCALIZED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthPagePath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  );
}

function isInvitePath(pathname: string) {
  return pathname === "/invite" || pathname.startsWith("/invite/");
}

function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding/household" || pathname.startsWith("/onboarding/household/");
}

function redirectWithNext(request: NextRequest, currentPath: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${currentPath}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

async function authProxy(request: NextRequest, pathnameOverride?: string) {
  const pathname = pathnameOverride ?? request.nextUrl.pathname;
  const session = await getCurrentAppSession(request);

  if (!session) {
    if (isPublicPath(pathname) || isInvitePath(pathname)) {
      return NextResponse.next();
    }

    return redirectWithNext(request, pathname);
  }

  const hasMembership = await hasHouseholdMembership(session.user.id);

  if (isAuthPagePath(pathname)) {
    return NextResponse.redirect(
      new URL(hasMembership ? "/app" : "/onboarding/household", request.url),
    );
  }

  if (!hasMembership && !isPublicPath(pathname) && !isInvitePath(pathname) && !isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL("/onboarding/household", request.url));
  }

  if (hasMembership && isOnboardingPath(pathname)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

const intlMiddleware = createIntlMiddleware(routing);

function redirectLegacyEnglishLocale(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/en" && !pathname.startsWith("/en/")) return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname =
    pathname === "/en" ? "/en-US" : pathname.replace(/^\/en(?=\/)/, "/en-US");
  redirectUrl.search = search;

  return NextResponse.redirect(redirectUrl);
}

function prefixLocale(path: string, locale: string): string {
  if (!path.startsWith("/") || path === `/${locale}` || path.startsWith(`/${locale}/`)) {
    return path;
  }

  return `/${locale}${path}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const legacyEnglishRedirect = redirectLegacyEnglishLocale(request);
  if (legacyEnglishRedirect) {
    return legacyEnglishRedirect;
  }

  if (
    isNonLocalizedPath(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/")
  ) {
    return authProxy(request);
  }

  const pathnameWithoutLocale = stripLocalePrefix(pathname);
  const localeMatch = pathname.match(localePrefixPattern);
  const currentLocale = localeMatch ? localeMatch[1] : routing.defaultLocale;
  const proxyResponse = await authProxy(request, pathnameWithoutLocale);

  if (proxyResponse.status >= 300 && proxyResponse.status < 400) {
    const location = proxyResponse.headers.get("location");

    if (location) {
      const locationUrl = new URL(location, request.url);
      const localeStrippedPath = stripLocalePrefix(locationUrl.pathname);
      locationUrl.pathname = prefixLocale(localeStrippedPath, currentLocale);
      return NextResponse.redirect(locationUrl.toString(), { status: proxyResponse.status });
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
