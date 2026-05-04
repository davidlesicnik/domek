import { revalidatePath } from "next/cache";

import { routing } from "@/i18n/routing";

export function revalidateDashboard() {
  revalidatePath("/app");

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/app`);
  }
}
