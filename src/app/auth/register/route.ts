import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { hashPassword } from "@/lib/auth/password";
import { createSession, writeSessionCookie } from "@/lib/auth/sessions";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { prisma } from "@/lib/db";
import { resolveAuthOrigin } from "@/lib/origin";
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
  const publicOrigin = resolveAuthOrigin(request);
  const formData = await request.formData();
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
    name: formData.get("name"),
    next: formData.get("next"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/register?status=register_error", publicOrigin), {
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
      new URL(buildRegisterUrl(parsed.data.locale, nextPath, "register_error"), publicOrigin),
      { status: 303 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    select: { id: true },
    where: { email },
  });

  if (existingUser) {
    return NextResponse.redirect(
      new URL(buildRegisterUrl(parsed.data.locale, nextPath, "account_exists"), publicOrigin),
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
  await writeSessionCookie(token, expiresAt);
  const destination = (await hasHouseholdMembership(user.id)) ? nextPath : "/onboarding/household";

  return NextResponse.redirect(new URL(destination, publicOrigin), { status: 303 });
}
