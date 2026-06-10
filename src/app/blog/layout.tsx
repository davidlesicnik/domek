import { redirect } from "next/navigation";

import { routing } from "@/i18n/routing";
import { getLocalizedAppEntryPath } from "@/lib/app-entry";

export default async function BlogLayout() {
  redirect(await getLocalizedAppEntryPath(routing.defaultLocale));
}
