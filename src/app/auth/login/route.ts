import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { createSession, writeSessionCookie } from "@/lib/auth/sessions";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { resolveAuthOrigin } from "@/lib/origin";
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

  if (status) {
    loginUrl.searchParams.set("status", status);
  }

  return `${loginUrl.pathname}${loginUrl.search}`;
}

export async function POST(request: NextRequest) {
  const publicOrigin = resolveAuthOrigin(request);
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
    next: formData.get("next"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/login?status=auth_error", publicOrigin), {
      status: 303,
    });
  }

  const email = parsed.data.email.toLowerCase();
  const nextPath = sanitizeAuthCallbackNextPath(parsed.data.next);
  const requestGuard = validatePublicRouteRequest(request, "email-auth", {
    formData,
    identifiers: [email],
  });

  if (!requestGuard.ok) {
    return NextResponse.redirect(
      new URL(buildLoginUrl(parsed.data.locale, nextPath, "auth_error"), publicOrigin),
      { status: 303 },
    );
  }

  const credential = await prisma.passwordCredential.findFirst({
    select: {
      passwordHash: true,
      user: {
        select: {
          deletedAt: true,
          id: true,
        },
      },
    },
    where: {
      user: {
        email,
      },
    },
  });

  const isValid =
    !!credential?.user &&
    !credential.user.deletedAt &&
    (await verifyPassword(parsed.data.password, credential.passwordHash));

  if (!isValid || !credential?.user) {
    return NextResponse.redirect(
      new URL(buildLoginUrl(parsed.data.locale, nextPath, "auth_error"), publicOrigin),
      { status: 303 },
    );
  }

  const { expiresAt, token } = await createSession(credential.user.id);
  await writeSessionCookie(token, expiresAt);
  const destination = (await hasHouseholdMembership(credential.user.id))
    ? nextPath
    : "/onboarding/household";

  return NextResponse.redirect(new URL(destination, publicOrigin), { status: 303 });
}
