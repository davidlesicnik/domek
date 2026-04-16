"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type GoogleAnalyticsProps = Readonly<{
  measurementId?: string;
}>;

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!measurementId || !isReady || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("event", "page_view", {
      page_location: window.location.href,
      page_path: `${pathname}${window.location.search}`,
      page_title: document.title,
    });
  }, [isReady, measurementId, pathname]);

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
