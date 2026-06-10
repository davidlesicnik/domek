import { getLocale } from "next-intl/server";
import { redirect as nextRedirect } from "next/navigation";
import type { RedirectType } from "next/dist/client/components/redirect-error";

import { routing } from "./routing";

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

function hasSupportedLocalePrefix(path: string): boolean {
  return routing.locales.some(
    (supportedLocale) =>
      path === `/${supportedLocale}` ||
      path.startsWith(`/${supportedLocale}/`) ||
      path.startsWith(`/${supportedLocale}?`) ||
      path.startsWith(`/${supportedLocale}#`),
  );
}

/**
 * Locale-aware redirect for use in Server Components and Server Actions.
 * Prepends the current request locale to relative app paths only.
 */
export async function redirect(href: string, type?: RedirectType): Promise<never> {
  if (isAbsoluteUrl(href)) {
    nextRedirect(href, type);
    throw new Error("redirect");
  }

  const locale = await getLocale();
  const path = href.startsWith("/") ? href : `/${href}`;
  const destination = hasSupportedLocalePrefix(path) ? path : `/${locale}${path}`;
  nextRedirect(destination, type);
  // nextRedirect always throws; this line is unreachable but satisfies TypeScript
  throw new Error("redirect");
}
