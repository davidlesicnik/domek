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
    <div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-normal text-[var(--text-subtle)]">
          Cookie preference
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
          {consent === "accepted" ? "Accepted" : consent === "rejected" ? "Rejected" : "Not set"}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:mt-0 sm:flex-row">
        <button
          className="h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 text-sm font-semibold text-[var(--text-strong)] shadow-sm transition hover:bg-[var(--surface-secondary)]"
          onClick={() => chooseConsent("rejected")}
          type="button"
        >
          Reject cookies
        </button>
        <button
          className="h-10 rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] shadow-sm transition hover:bg-[var(--button-primary-hover)]"
          onClick={() => chooseConsent("accepted")}
          type="button"
        >
          Accept cookies
        </button>
      </div>
    </div>
  );
}
