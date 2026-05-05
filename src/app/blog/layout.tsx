import type { ReactNode } from "react";
import { Suspense } from "react";

import { BlogCookieBanner } from "@/components/blog/blog-cookie-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { UmamiAnalytics } from "@/components/analytics/umami-analytics";
import { BlogShell } from "@/components/blog/blog-shell";

import "../globals.css";

export default function BlogLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <BlogShell>{children}</BlogShell>
        <BlogCookieBanner enabled={Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)} />
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        </Suspense>
        <UmamiAnalytics />
      </body>
    </html>
  );
}
