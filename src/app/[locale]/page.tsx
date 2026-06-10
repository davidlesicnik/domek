import { redirect } from "@/i18n/server";

import { getLocalizedAppEntryPath } from "@/lib/app-entry";

type LandingPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;
  return await redirect(await getLocalizedAppEntryPath(locale));
}
