import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase";
import { upsertSupabaseUser } from "@/lib/users";

const nextCookieName = "domek_next";

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (value.startsWith("/login") || value.startsWith("/auth/callback")) {
    return "/";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(request.cookies.get(nextCookieName)?.value);

  if (!code) {
    const response = NextResponse.redirect(new URL("/login?error=auth", request.url));
    response.cookies.delete(nextCookieName);
    return response;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const response = NextResponse.redirect(new URL("/login?error=auth", request.url));
    response.cookies.delete(nextCookieName);
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(new URL("/login?error=auth", request.url));
    response.cookies.delete(nextCookieName);
    return response;
  }

  const appUser = await upsertSupabaseUser(user);
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { userId: appUser.id },
  });

  const response = NextResponse.redirect(new URL(membership ? next : "/onboarding/household", request.url));
  response.cookies.delete(nextCookieName);
  return response;
}
