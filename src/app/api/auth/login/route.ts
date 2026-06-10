import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

import { routing } from "@/i18n/routing";
import { createSession, setSessionCookieOnResponse } from "@/lib/auth/sessions";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { verifyPassword } from "@/lib/auth/password";
import {
  isAuthSetupError,
  logAuthRouteError,
  readAuthRequestData,
  resolveAuthOriginSafely,
} from "@/lib/auth/route-utils";
import { prisma } from "@/lib/db";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";
import { hasHouseholdMembership } from "@/lib/users";

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  locale: z.enum(routing.locales),
  next: z.string().optional(),
  password: z.string().min(8).max(200),
});

function buildLoginUrl(locale: string, nextPath: string, status?: string) {
  const loginUrl = new URL(`/${locale}/login`, "https://domek.local");
  loginUrl.searchParams.set("next", nextPath);
  if (status) loginUrl.searchParams.set("status", status);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

export async function POST(request: NextRequest) {
  const publicOrigin = resolveAuthOriginSafely(request);
  const body = await readAuthRequestData(request);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/login?status=auth_error", publicOrigin), {
      status: 303,
    });
  }

  const email = parsed.data.email.toLowerCase();
  const nextPath = sanitizeAuthCallbackNextPath(parsed.data.next);
  const requestGuard = validatePublicRouteRequest(request, "email-auth", {
    identifiers: [email],
  });

  if (!requestGuard.ok) {
    return NextResponse.redirect(
      new URL(buildLoginUrl(parsed.data.locale, nextPath, "auth_error"), publicOrigin),
      { status: 303 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      select: {
        deletedAt: true,
        id: true,
        passwordCredential: {
          select: {
            passwordHash: true,
          },
        },
      },
      where: { email },
    });

    const isValid =
      !!user &&
      !user.deletedAt &&
      !!user.passwordCredential &&
      (await verifyPassword(parsed.data.password, user.passwordCredential.passwordHash));

    if (user && !user.deletedAt && !user.passwordCredential) {
      return NextResponse.redirect(
        new URL(buildLoginUrl(parsed.data.locale, nextPath, "password_not_set"), publicOrigin),
        { status: 303 },
      );
    }

    if (!isValid || !user) {
      return NextResponse.redirect(
        new URL(buildLoginUrl(parsed.data.locale, nextPath, "auth_error"), publicOrigin),
        { status: 303 },
      );
    }

    const { expiresAt, token } = await createSession(user.id);
    const destination = (await hasHouseholdMembership(user.id))
      ? nextPath
      : "/onboarding/household";

    const response = NextResponse.redirect(new URL(destination, publicOrigin), { status: 303 });
    setSessionCookieOnResponse(response, token, expiresAt);
    return response;
  } catch (error) {
    logAuthRouteError("login", error);

    return NextResponse.redirect(
      new URL(
        buildLoginUrl(parsed.data.locale, nextPath, isAuthSetupError(error) ? "setup_error" : "auth_error"),
        publicOrigin,
      ),
      { status: 303 },
    );
  }
}
