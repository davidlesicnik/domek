import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";

import "./globals.css";

export const metadata: Metadata = {
  title: "Domek",
  description: "A household planner for shared calendars, tasks, notes, chores, and expenses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        </Suspense>
      </body>
    </html>
  );
}
