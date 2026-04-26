"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeNames: Record<string, string> = {
  en: "EN",
  sl: "SL",
};

export function LocaleSwitcher() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("langLabel")} className="flex items-center gap-2">
      {routing.locales.map((loc, i) => (
        <span key={loc} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden className="text-xs text-[#d0cdc6]">/</span>}
          <Link
            href={pathname}
            locale={loc}
            className={`text-xs transition ${
              loc === locale
                ? "font-semibold text-[#3c413e]"
                : "text-[#9ea49f] hover:text-[#686e6a]"
            }`}
          >
            {localeNames[loc]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
