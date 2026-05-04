import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export async function Footer() {
  const t = await getTranslations("footer");

  const links = [
    { label: t("privacyPolicy"), href: "/privacy" as const },
    { label: t("termsOfUse"), href: "/terms" as const },
    { label: t("refundPolicy"), href: "/refund-policy" as const },
    { label: t("cookiePolicy"), href: "/cookies" as const },
    { label: t("contact"), href: "/contact" as const },
  ];

  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--shell-background)] px-4 pt-6 pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-xs text-[var(--text-subtle)]">{t("tagline")}</p>
          <LocaleSwitcher />
        </div>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-xs text-[var(--text-subtle)] underline-offset-2 transition hover:text-[var(--text-muted)] hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
