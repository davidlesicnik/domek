"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [isReady, setIsReady] = useState(false);
  const pagePath = useMemo(() => {
    const stableSearchParams = new URLSearchParams(searchParamSnapshot);

    return `${sanitizePathname(pathname)}${sanitizeSearchParams(stableSearchParams)}`;
  }, [pathname, searchParamSnapshot]);

  useEffect(() => {
    if (!measurementId || !isReady || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_title: document.title,
    });
  }, [isReady, measurementId, pagePath]);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" onReady={() => setIsReady(true)} strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
