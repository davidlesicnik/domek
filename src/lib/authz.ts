import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase";
import { hasHouseholdMembership, upsertSupabaseUser, type AppUser } from "@/lib/users";

export type AppSession = Readonly<{
  user: AppUser;
}>;

export async function getCurrentAppSession(): Promise<AppSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { deletedAt, ...appUser } = await upsertSupabaseUser(user);

  if (deletedAt) {
    await supabase.auth.signOut();
    return null;
  }

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
