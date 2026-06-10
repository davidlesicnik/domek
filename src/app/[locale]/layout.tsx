import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { getCurrentAppSession } from "@/lib/authz";
import { themePreferenceToForcedTheme } from "@/lib/theme";

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
  themeColor: [
    { color: "#f8f6f1", media: "(prefers-color-scheme: light)" },
    { color: "#161816", media: "(prefers-color-scheme: dark)" },
  ],
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

  const [messages, session] = await Promise.all([getMessages(), getCurrentAppSession()]);
  const forcedTheme = themePreferenceToForcedTheme(session?.user.themePreference);

  return (
    <html
      lang={locale}
      className={`h-full antialiased${forcedTheme ? ` ${forcedTheme}` : ""}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <AppThemeProvider forcedTheme={forcedTheme}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
