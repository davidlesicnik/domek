"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  cookieConsentChangedEvent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentValue,
} from "@/lib/analytics";

type CookieBannerBaseProps = Readonly<{
  acceptLabel: string;
  description: ReactNode;
  enabled: boolean;
  rejectLabel: string;
  title: string;
}>;

export function CookieBannerBase({
  acceptLabel,
  description,
  enabled,
  rejectLabel,
  title,
}: CookieBannerBaseProps) {
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
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-float)] sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="mt-1">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] px-4 text-sm font-semibold text-[var(--text-strong)] shadow-sm transition hover:bg-[var(--surface-secondary)]"
            onClick={() => chooseConsent("rejected")}
            type="button"
          >
            {rejectLabel}
          </button>
          <button
            className="h-10 rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] shadow-sm transition hover:bg-[var(--button-primary-hover)]"
            onClick={() => chooseConsent("accepted")}
            type="button"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
