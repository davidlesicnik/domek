"use client";

import Link from "next/link";
import { CookieBannerBase } from "@/components/analytics/cookie-banner-base";

type BlogCookieBannerProps = Readonly<{
  enabled: boolean;
}>;

export function BlogCookieBanner({ enabled }: BlogCookieBannerProps) {
  return (
    <CookieBannerBase
      acceptLabel="Accept cookies"
      description={(
        <>
          We use analytics cookies to understand which blog articles help people find Domek. Read the{" "}
          <Link className="font-semibold underline underline-offset-2" href="/en-US/cookies">
            cookie policy
          </Link>{" "}
          for details.
        </>
      )}
      enabled={enabled}
      rejectLabel="Reject cookies"
      title="Cookie notice"
    />
  );
}
