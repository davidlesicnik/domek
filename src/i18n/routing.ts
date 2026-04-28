import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en-US", "en-GB", "sl"],
  defaultLocale: "en-US",
});

export function localeMessageFile(locale: string): "en" | "sl" {
  return locale === "sl" ? "sl" : "en";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const localePrefixPattern = new RegExp(`^/(${routing.locales.map(escapeRegex).join("|")})(/|$)`);

export function stripLocalePrefix(pathname: string): string {
  return pathname.replace(localePrefixPattern, "/").replace(/\/+/g, "/");
}
