import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

import { routing } from "@/i18n/routing";
import { hashPassword } from "@/lib/auth/password";
import {
  isAuthSetupError,
  logAuthRouteError,
  readAuthRequestData,
  resolveAuthOriginSafely,
} from "@/lib/auth/route-utils";
import { createSession, setSessionCookieOnResponse } from "@/lib/auth/sessions";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/db";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";
import { hasHouseholdMembership } from "@/lib/users";

const registerSchema = z.object({
  email: z.string().trim().email().max(320),
  locale: z.enum(routing.locales),
  name: z.string().trim().min(1).max(120),
  next: z.string().optional(),
  password: z.string().min(8).max(200),
});

function buildRegisterUrl(locale: string, nextPath: string, status?: string) {
  const registerUrl = new URL(`/${locale}/register`, "https://domek.local");
  registerUrl.searchParams.set("next", nextPath);

  if (status) {
    registerUrl.searchParams.set("status", status);
  }

  return `${registerUrl.pathname}${registerUrl.search}`;
}

export async function POST(request: NextRequest) {
  const publicOrigin = resolveAuthOriginSafely(request);
  const body = await readAuthRequestData(request);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/register?status=register_error", publicOrigin), {
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
      new URL(buildRegisterUrl(parsed.data.locale, nextPath, "register_error"), publicOrigin),
      { status: 303 },
    );
  }

  try {
    const existingUser = await prisma.user.findUnique({
      select: {
        id: true,
        passwordCredential: {
          select: { userId: true },
        },
      },
      where: { email },
    });

    if (existingUser) {
      return NextResponse.redirect(
        new URL(
          buildRegisterUrl(
            parsed.data.locale,
            nextPath,
            existingUser.passwordCredential ? "account_exists" : "password_not_set",
          ),
          publicOrigin,
        ),
        { status: 303 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email,
        id: randomUUID(),
        name: parsed.data.name,
        passwordCredential: {
          create: {
            passwordHash,
            passwordSetAt: new Date(),
          },
        },
      },
      select: { id: true },
    });

    const { expiresAt, token } = await createSession(user.id);
    const destination = (await hasHouseholdMembership(user.id))
      ? nextPath
      : "/onboarding/household";

    const response = NextResponse.redirect(new URL(destination, publicOrigin), { status: 303 });
    setSessionCookieOnResponse(response, token, expiresAt);
    return response;
  } catch (error) {
    logAuthRouteError("register", error);

    return NextResponse.redirect(
      new URL(
        buildRegisterUrl(
          parsed.data.locale,
          nextPath,
          isAuthSetupError(error) ? "setup_error" : "register_error",
        ),
        publicOrigin,
      ),
      { status: 303 },
    );
  }
}
