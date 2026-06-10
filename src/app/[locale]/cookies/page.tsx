import { redirect } from "@/i18n/server";

import { getLocalizedAppEntryPath } from "@/lib/app-entry";

type CookiesPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function CookiesPage({ params }: CookiesPageProps) {
  const { locale } = await params;
  return await redirect(await getLocalizedAppEntryPath(locale));
}
