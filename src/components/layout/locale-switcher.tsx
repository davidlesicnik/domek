"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeNames: Record<string, string> = {
  "en-US": "US",
  "en-GB": "UK",
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
          {i > 0 && <span aria-hidden className="text-xs text-[var(--border-strong)]">/</span>}
          <Link
            href={pathname}
            locale={loc}
            className={`text-xs transition ${
              loc === locale
                ? "font-semibold text-[var(--text-strong)]"
                : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
            }`}
          >
            {localeNames[loc]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
