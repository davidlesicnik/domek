import { routing } from "@/i18n/routing";
import { getCurrentAppSession } from "@/lib/authz";
import { hasHouseholdMembership } from "@/lib/users";

export async function getLocalizedAppEntryPath(locale?: string) {
  const resolvedLocale = locale ?? routing.defaultLocale;
  const session = await getCurrentAppSession();

  if (!session) {
    return `/${resolvedLocale}/login`;
  }

  const hasMembership = await hasHouseholdMembership(session.user.id);
  return hasMembership
    ? `/${resolvedLocale}/app`
    : `/${resolvedLocale}/onboarding/household`;
}
