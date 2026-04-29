"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cookieConsentChangedEvent,
  disableAnalytics,
  ensureAnalyticsBootstrap,
  hasCookieConsent as hasStoredCookieConsent,
  updateAnalyticsConsent,
} from "@/lib/analytics";

type GoogleAnalyticsProps = Readonly<{
  measurementId?: string;
}>;

const trackedQueryParams = ["error", "success"] as const;
const safeQueryValuePattern = /^[a-z0-9_-]{1,64}$/i;

function sanitizePathname(pathname: string) {
  if (pathname.startsWith("/invite/")) {
    return "/invite/[token]";
  }

  if (pathname.startsWith("/auth/start/")) {
    return "/auth/start/[provider]";
  }

  return pathname;
}

function sanitizeSearchParams(searchParams: URLSearchParams) {
  const sanitizedParams = new URLSearchParams();

  for (const key of trackedQueryParams) {
    const value = searchParams.get(key);

    if (!value) {
      continue;
    }

    sanitizedParams.set(key, safeQueryValuePattern.test(value) ? value : "present");
  }

  const queryString = sanitizedParams.toString();

  return queryString ? `?${queryString}` : "";
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamSnapshot = searchParams.toString();
  const [isCookieConsentAccepted, setIsCookieConsentAccepted] = useState(false);
  const hasConfiguredRef = useRef(false);
  const lastTrackedPathRef = useRef<string | null>(null);
  const pagePath = useMemo(() => {
    const stableSearchParams = new URLSearchParams(searchParamSnapshot);

    return `${sanitizePathname(pathname)}${sanitizeSearchParams(stableSearchParams)}`;
  }, [pathname, searchParamSnapshot]);

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    ensureAnalyticsBootstrap();

    function syncConsent() {
      const isAccepted = hasStoredCookieConsent();
      setIsCookieConsentAccepted(isAccepted);

      if (!isAccepted) {
        hasConfiguredRef.current = false;
        lastTrackedPathRef.current = null;
        disableAnalytics();
        return;
      }

      updateAnalyticsConsent(true);
    }

    syncConsent();
    window.addEventListener(cookieConsentChangedEvent, syncConsent);

    return () => window.removeEventListener(cookieConsentChangedEvent, syncConsent);
  }, [measurementId]);

  useEffect(() => {
    if (
      !measurementId ||
      !isCookieConsentAccepted ||
      typeof window.gtag !== "function"
    ) {
      return;
    }

    if (!hasConfiguredRef.current) {
      window.gtag("config", measurementId, { send_page_view: false });
      hasConfiguredRef.current = true;
    }

    if (lastTrackedPathRef.current === pagePath) {
      return;
    }

    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_title: document.title,
    });
    lastTrackedPathRef.current = pagePath;
  }, [isCookieConsentAccepted, measurementId, pagePath]);

  if (!measurementId || !isCookieConsentAccepted) {
    return null;
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      onReady={() => {
        ensureAnalyticsBootstrap();
      }}
    />
  );
}
