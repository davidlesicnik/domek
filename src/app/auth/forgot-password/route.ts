import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { createPasswordResetToken } from "@/lib/auth/reset-tokens";
import { sanitizeAuthStartNextPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { getOptionalEmailConfig } from "@/lib/env";
import { resolveAuthOrigin } from "@/lib/origin";
import { validatePublicRouteRequest } from "@/lib/public-request-guard";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(320),
  locale: z.enum(routing.locales),
  next: z.string().optional(),
});

function buildForgotUrl(locale: string, nextPath: string, status?: string) {
  const url = new URL(`/${locale}/forgot-password`, "https://domek.local");
  url.searchParams.set("next", nextPath);

  if (status) {
    url.searchParams.set("status", status);
  }

  return `${url.pathname}${url.search}`;
}

export async function POST(request: NextRequest) {
  const publicOrigin = resolveAuthOrigin(request);
  const formData = await request.formData();
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/forgot-password?status=reset_error", publicOrigin), {
      status: 303,
    });
  }

  const email = parsed.data.email.toLowerCase();
  const nextPath = sanitizeAuthStartNextPath(parsed.data.next);
  const requestGuard = validatePublicRouteRequest(request, "email-auth", {
    formData,
    identifiers: [email],
  });

  if (!requestGuard.ok) {
    return NextResponse.redirect(
      new URL(buildForgotUrl(parsed.data.locale, nextPath, "reset_sent"), publicOrigin),
      { status: 303 },
    );
  }

  if (!getOptionalEmailConfig()) {
    return NextResponse.redirect(
      new URL(buildForgotUrl(parsed.data.locale, nextPath, "reset_manual"), publicOrigin),
      { status: 303 },
    );
  }

  const user = await prisma.user.findFirst({
    select: { id: true },
    where: {
      deletedAt: null,
      email,
    },
  });

  if (user) {
    const { token } = await createPasswordResetToken(user.id);
    const resetUrl = new URL(`/${parsed.data.locale}/reset-password`, publicOrigin);
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("next", nextPath);

    await sendPasswordResetEmail({
      locale: parsed.data.locale,
      resetUrl: resetUrl.toString(),
      toEmail: email,
    });
  }

  return NextResponse.redirect(
    new URL(buildForgotUrl(parsed.data.locale, nextPath, "reset_sent"), publicOrigin),
    { status: 303 },
  );
}
