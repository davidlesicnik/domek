"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

function isMobileUserAgent(userAgent: string) {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

type InviteAppOpenBridgeProps = Readonly<{
  locale: string;
  token: string;
}>;

export function InviteAppOpenBridge({
  locale,
  token,
}: InviteAppOpenBridgeProps) {
  const t = useTranslations("common");
  const [showButton] = useState(
    () =>
      typeof window !== "undefined" &&
      isMobileUserAgent(window.navigator.userAgent),
  );
  const deepLink = useMemo(
    () =>
      `domek://invite/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale)}`,
    [locale, token],
  );

  useEffect(() => {
    if (!showButton) return;
    const timer = window.setTimeout(() => {
      window.location.assign(deepLink);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [deepLink, showButton]);

  if (!showButton) return null;

  return (
    <div className="mt-6">
      <a
        className="inline-flex h-11 items-center justify-center rounded-md border border-[#d7d4cb] bg-white px-4 text-sm font-medium text-[#3c413e] transition hover:border-[#c6c1b7] hover:text-[#171a18]"
        href={deepLink}
      >
        {t("openDomek")}
      </a>
    </div>
  );
}
