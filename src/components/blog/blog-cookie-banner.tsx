"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  cookieConsentChangedEvent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentValue,
} from "@/lib/analytics";

type BlogCookieBannerProps = Readonly<{
  enabled: boolean;
}>;

export function BlogCookieBanner({ enabled }: BlogCookieBannerProps) {
  const [consent, setConsent] = useState<CookieConsentValue | null>("rejected");

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function syncConsent() {
      setConsent(readCookieConsent());
    }

    syncConsent();
    window.addEventListener(cookieConsentChangedEvent, syncConsent);

    return () => window.removeEventListener(cookieConsentChangedEvent, syncConsent);
  }, [enabled]);

  if (!enabled || consent) {
    return null;
  }

  function chooseConsent(value: CookieConsentValue) {
    writeCookieConsent(value);
    setConsent(value);
  }

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 bg-transparent px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 rounded-md border border-[#d8d2c8] bg-[#fffdf8] p-4 shadow-[0_12px_34px_rgba(31,35,30,0.14)] sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl text-sm leading-6 text-[#4f5752]">
          <p className="font-semibold text-[#202321]">Cookie notice</p>
          <p className="mt-1">
            We use analytics cookies to understand which blog articles help people find Domek. Read the{" "}
            <Link className="font-semibold underline underline-offset-2" href="/en-US/cookies">
              cookie policy
            </Link>
            {" "}for details.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="h-10 rounded-md border border-[#cfc8bd] bg-[#fffdf8] px-4 text-sm font-semibold text-[#3c413e] shadow-sm transition hover:bg-[#f4f1ea]"
            onClick={() => chooseConsent("rejected")}
            type="button"
          >
            Reject cookies
          </button>
          <button
            className="h-10 rounded-md border border-[#3c413e] bg-[#3c413e] px-4 text-sm font-semibold text-[#fffdf8] shadow-sm transition hover:bg-[#202321]"
            onClick={() => chooseConsent("accepted")}
            type="button"
          >
            Accept cookies
          </button>
        </div>
      </div>
    </section>
  );
}
