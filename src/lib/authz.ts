import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getSessionRecord, readSessionToken } from "@/lib/auth/sessions";
import { hasHouseholdMembership, type AppUser } from "@/lib/users";

export type AppSession = Readonly<{
  user: AppUser;
}>;

export async function getCurrentAppSession(request?: Request): Promise<AppSession | null> {
  const token = await readSessionToken(request);
  const sessionRecord = await getSessionRecord(token);

  if (!sessionRecord?.user || sessionRecord.user.deletedAt) {
    return null;
  }

  const { deletedAt, ...user } = sessionRecord.user;
  void deletedAt;
  return { user };
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
