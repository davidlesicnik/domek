import { NextResponse, type NextRequest } from "next/server";

import { hasAccess } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { sanitizeAuthCallbackNextPath } from "@/lib/auth-redirect";
import { resolveAuthOrigin } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase";
import { ensureTrialStartedAt, upsertSupabaseUser } from "@/lib/users";

const nextCookieName = "domek_next";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const publicOrigin = resolveAuthOrigin(request);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const tokenType = requestUrl.searchParams.get("type");
  const next = sanitizeAuthCallbackNextPath(request.cookies.get(nextCookieName)?.value);
  const supabase = await createSupabaseServerClient();
  const authResult = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && (tokenType === "email" || tokenType === "magiclink")
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType })
      : { error: new Error("Missing auth callback parameters.") };

  if (authResult.error) {
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

  const upsertedUser = await upsertSupabaseUser(user);
  const appUser = await ensureTrialStartedAt(upsertedUser);
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { accountId: appUser.id, household: { deletedAt: null } },
  });
  const billingSubscription = membership
    ? null
    : await prisma.billingSubscription.findUnique({
        select: { status: true },
        where: { userId: appUser.id },
      });
  const hasBillingAccess = hasAccess({
    billingSubscription,
    developmentAccessGrantedAt: appUser.developmentAccessGrantedAt,
    trialStartedAt: appUser.trialStartedAt,
  });

  const isInviteNext = next.startsWith("/invite/");
  const destination = membership
    ? next
    : isInviteNext
      ? next
      : hasBillingAccess
        ? "/onboarding/household"
        : "/trial-ended";
  const response = NextResponse.redirect(new URL(destination, publicOrigin));
  response.cookies.delete(nextCookieName);
  return response;
}
