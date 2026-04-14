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

  return {
    user: await upsertSupabaseUser(user),
  };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getCurrentAppSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireHouseholdMemberSession(): Promise<AppSession> {
  const session = await requireAppSession();

  if (!(await hasHouseholdMembership(session.user.id))) {
    redirect("/onboarding/household");
  }

  return session;
}
