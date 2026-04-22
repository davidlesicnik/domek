import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { resolveAuthOrigin } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase";
import { upsertSupabaseUser } from "@/lib/users";

const nextCookieName = "domek_next";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const publicOrigin = resolveAuthOrigin(request);

  const code = requestUrl.searchParams.get("code");
  const next = sanitizeAuthCallbackNextPath(request.cookies.get(nextCookieName)?.value);

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
    where: { accountId: appUser.id, household: { deletedAt: null } },
  });

  const isInviteNext = next.startsWith("/invite/");
  const destination = membership
    ? next
    : isInviteNext
      ? next
      : appUser.developmentAccessGrantedAt
        ? "/onboarding/household"
        : "/onboarding/payment";
  const response = NextResponse.redirect(new URL(destination, publicOrigin));
  response.cookies.delete(nextCookieName);
  return response;
}
