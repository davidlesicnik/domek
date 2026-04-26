import { getLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import type { RedirectType } from "next/dist/client/components/redirect-error";

/**
 * Locale-aware redirect for use in Server Components and Server Actions.
 * Prepends the current request locale to the given path.
 */
export async function redirect(href: string, type?: RedirectType): Promise<never> {
  const locale = await getLocale();
  const path = href.startsWith("/") ? href : `/${href}`;
  nextRedirect(`/${locale}${path}`, type);
  // nextRedirect always throws; this line is unreachable but satisfies TypeScript
  throw new Error("redirect");
}
