"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { CookieBannerBase } from "@/components/analytics/cookie-banner-base";

type CookieBannerProps = Readonly<{
  enabled: boolean;
}>;

export function CookieBanner({ enabled }: CookieBannerProps) {
  const t = useTranslations("cookieBanner");

  return (
    <CookieBannerBase
      acceptLabel={t("acceptCookies")}
      description={(
        <>
          {t("descriptionStart")}
          <Link className="font-semibold underline underline-offset-2" href="/cookies">
            {t("cookiePolicy")}
          </Link>
          {t("descriptionEnd")}
        </>
      )}
      enabled={enabled}
      rejectLabel={t("rejectCookies")}
      title={t("title")}
    />
  );
}
