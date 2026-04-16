"use client";

import { useEffect, useState } from "react";

import {
  cookieConsentChangedEvent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentValue,
} from "@/lib/analytics";

export function CookiePreferences() {
  const [consent, setConsent] = useState<CookieConsentValue | null>(null);

  useEffect(() => {
    function syncConsent() {
      setConsent(readCookieConsent());
    }

    syncConsent();
    window.addEventListener(cookieConsentChangedEvent, syncConsent);

    return () => window.removeEventListener(cookieConsentChangedEvent, syncConsent);
  }, []);

  function chooseConsent(value: CookieConsentValue) {
    writeCookieConsent(value);
    setConsent(value);
  }

  return (
    <div className="rounded-md border border-[#d8d2c8] bg-[#fffdf8] p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-normal text-[#777f7a]">
          Cookie preference
        </p>
        <p className="mt-1 text-sm font-semibold text-[#202321]">
          {consent === "accepted" ? "Accepted" : consent === "rejected" ? "Rejected" : "Not set"}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row">
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
  );
}
