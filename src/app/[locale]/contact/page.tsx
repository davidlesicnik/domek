import { redirect } from "@/i18n/server";

import { getLocalizedAppEntryPath } from "@/lib/app-entry";

type ContactPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  return await redirect(await getLocalizedAppEntryPath(locale));
}
