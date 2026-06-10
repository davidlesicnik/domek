import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { hashPassword } from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/reset-tokens";
import { createSession, writeSessionCookie } from "@/lib/auth/sessions";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/db";
import { resolveAuthOrigin } from "@/lib/origin";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";
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
  const publicOrigin = resolveAuthOrigin(request);
  const formData = await request.formData();
  const parsed = resetPasswordSchema.safeParse({
    locale: formData.get("locale"),
    next: formData.get("next"),
    password: formData.get("password"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/reset-password?status=token_error", publicOrigin), {
      status: 303,
    });
  }

  const nextPath = sanitizeAuthCallbackNextPath(parsed.data.next);
  const requestGuard = validatePublicRouteRequest(request, "email-auth", {
    formData,
    identifiers: [parsed.data.token],
  });

  if (!requestGuard.ok) {
    return NextResponse.redirect(
      new URL(buildResetUrl(parsed.data.locale, parsed.data.token, nextPath, "token_error"), publicOrigin),
      { status: 303 },
    );
  }

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
  await writeSessionCookie(token, expiresAt);
  const destination = (await hasHouseholdMembership(resetToken.userId))
    ? nextPath
    : "/onboarding/household";

  return NextResponse.redirect(new URL(destination, publicOrigin), { status: 303 });
}
