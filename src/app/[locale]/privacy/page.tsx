import { redirect } from "@/i18n/server";

import { getLocalizedAppEntryPath } from "@/lib/app-entry";

type PrivacyPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  return await redirect(await getLocalizedAppEntryPath(locale));
}
