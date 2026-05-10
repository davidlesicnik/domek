import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { createSupabaseAccessTokenClient, createSupabaseServerClient } from "@/lib/supabase";
import { ensureTrialStartedAt, hasHouseholdMembership, upsertSupabaseUser, type AppUser } from "@/lib/users";

export type AppSession = Readonly<{
  user: AppUser;
}>;

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return null;

  if (authHeader.length < 7 || authHeader.slice(0, 7).toLowerCase() !== "bearer ") {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function getCurrentAppSession(request?: Request): Promise<AppSession | null> {
  const bearerToken = request ? getBearerToken(request) : null;
  const supabase = bearerToken
    ? createSupabaseAccessTokenClient(bearerToken)
    : await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { deletedAt, ...upsertedUser } = await upsertSupabaseUser(user);

  if (deletedAt) {
    await supabase.auth.signOut();
    return null;
  }

  const appUser = await ensureTrialStartedAt(upsertedUser);

  return { user: appUser };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getCurrentAppSession();

  if (!session) {
    const locale = await getLocale();
    redirect(`/${locale}/login?next=/${locale}/app`);
  }

  return session;
}

export async function requireHouseholdMemberSession(): Promise<AppSession> {
  const session = await requireAppSession();

  if (!(await hasHouseholdMembership(session.user.id))) {
    const locale = await getLocale();
    redirect(`/${locale}/onboarding/household`);
  }

  return session;
}
