import { redirect } from "@/i18n/server";

import { getLocalizedAppEntryPath } from "@/lib/app-entry";

type TermsPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  return await redirect(await getLocalizedAppEntryPath(locale));
}
