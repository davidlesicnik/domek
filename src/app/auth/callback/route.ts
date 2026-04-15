import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase";
import { upsertSupabaseUser } from "@/lib/users";

const nextCookieName = "domek_next";

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  if (value.startsWith("/login") || value.startsWith("/auth/callback")) {
    return "/app";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const publicOrigin = `${proto}://${host}`;

  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(request.cookies.get(nextCookieName)?.value);

  if (!code) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    response.cookies.delete(nextCookieName);
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    response.cookies.delete(nextCookieName);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(new URL("/login?error=auth", publicOrigin));
    response.cookies.delete(nextCookieName);
    return response;
  }

  const appUser = await upsertSupabaseUser(user);
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { userId: appUser.id },
  });

  const isInviteNext = next.startsWith("/invite/");
  const destination = membership ? next : isInviteNext ? next : "/onboarding/household";
  const response = NextResponse.redirect(new URL(destination, publicOrigin));
  response.cookies.delete(nextCookieName);
  return response;
}
