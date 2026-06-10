import { redirect } from "@/i18n/server";

import { getLocalizedAppEntryPath } from "@/lib/app-entry";

type RefundPolicyPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function RefundPolicyPage({ params }: RefundPolicyPageProps) {
  const { locale } = await params;
  return await redirect(await getLocalizedAppEntryPath(locale));
}
