import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

import { CookieBanner } from "@/components/analytics/cookie-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { routing } from "@/i18n/routing";

import "../globals.css";

export const metadata: Metadata = {
  applicationName: "Domek",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Domek",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f8a5b",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieBanner enabled={Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)} />
          <Suspense fallback={null}>
            <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
