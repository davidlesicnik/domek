import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { sanitizeAuthStartNextPath } from "@/lib/auth-redirect";
import { resolveAuthOrigin } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase";

const nextCookieName = "domek_next";

const emailAuthSchema = z.object({
  email: z.string().trim().email(),
  locale: z.enum(routing.locales),
  next: z.string().optional(),
});

function buildLoginUrl(locale: string, nextPath: string, status: "auth" | "sent") {
  const loginUrl = new URL(`/${locale}/login`, "https://domek.local");
  loginUrl.searchParams.set("next", nextPath);

  if (status === "sent") {
    loginUrl.searchParams.set("email", "sent");
  } else {
    loginUrl.searchParams.set("error", "auth");
  }

  return `${loginUrl.pathname}${loginUrl.search}`;
}

export async function POST(request: NextRequest) {
  const publicOrigin = resolveAuthOrigin(request);
  const formData = await request.formData();
  const parsed = emailAuthSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/en-US/login?error=auth", publicOrigin), {
      status: 303,
    });
  }

  const nextPath = sanitizeAuthStartNextPath(parsed.data.next);
  const redirectTo = new URL("/auth/callback", publicOrigin).toString();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  const isSecure = new URL(publicOrigin).protocol === "https:";
  const response = NextResponse.redirect(
    new URL(
      buildLoginUrl(parsed.data.locale, nextPath, error ? "auth" : "sent"),
      publicOrigin,
    ),
    { status: 303 },
  );

  if (!error) {
    response.cookies.set(nextCookieName, nextPath, {
      httpOnly: true,
      maxAge: 600,
      path: "/",
      sameSite: "lax",
      secure: isSecure,
    });
  }

  return response;
}
