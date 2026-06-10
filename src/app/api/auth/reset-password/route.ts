import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

import { routing } from "@/i18n/routing";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/reset-tokens";
import { logAuthRouteError, readAuthRequestData, resolveAuthOriginSafely } from "@/lib/auth/route-utils";
import { createSession, setSessionCookieOnResponse } from "@/lib/auth/sessions";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/db";
import { hasHouseholdMembership } from "@/lib/users";

const resetPasswordSchema = z.object({
  locale: z.enum(routing.locales),
  next: z.string().optional(),
  password: z.string().min(8).max(200),
  token: z.string().min(1),
});

function buildResetUrl(locale: string, token: string, nextPath: string, status?: string) {
  const url = new URL(`/${locale}/reset-password`, "https://domek.local");
  url.searchParams.set("token", token);
  url.searchParams.set("next", nextPath);

  if (status) {
    url.searchParams.set("status", status);
  }

  return `${url.pathname}${url.search}`;
}

export async function POST(request: NextRequest) {
  const publicOrigin = resolveAuthOriginSafely(request);
  const body = await readAuthRequestData(request);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/reset-password?status=token_error", publicOrigin), {
      status: 303,
    });
  }

  const nextPath = sanitizeAuthCallbackNextPath(parsed.data.next);

  try {
    const resetToken = await consumePasswordResetToken(parsed.data.token);

    if (!resetToken) {
      return NextResponse.redirect(
        new URL(buildResetUrl(parsed.data.locale, parsed.data.token, nextPath, "token_error"), publicOrigin),
        { status: 303 },
      );
    }

    await prisma.passwordCredential.upsert({
      create: {
        passwordHash: await hashPassword(parsed.data.password),
        passwordSetAt: new Date(),
        userId: resetToken.userId,
      },
      update: {
        passwordHash: await hashPassword(parsed.data.password),
        passwordSetAt: new Date(),
      },
      where: { userId: resetToken.userId },
    });

    const { expiresAt, token } = await createSession(resetToken.userId);
    const destination = (await hasHouseholdMembership(resetToken.userId))
      ? nextPath
      : "/onboarding/household";

    const response = NextResponse.redirect(new URL(destination, publicOrigin), { status: 303 });
    setSessionCookieOnResponse(response, token, expiresAt);
    return response;
  } catch (error) {
    logAuthRouteError("reset-password", error);
    return NextResponse.redirect(
      new URL(buildResetUrl(parsed.data.locale, parsed.data.token, nextPath, "token_error"), publicOrigin),
      { status: 303 },
    );
  }
}
