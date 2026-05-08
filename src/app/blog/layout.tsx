import type { ReactNode } from "react";

import { MetaPixel } from "@/components/analytics/meta-pixel";
import { UmamiAnalytics } from "@/components/analytics/umami-analytics";
import { BlogShell } from "@/components/blog/blog-shell";
import { getOptionalMetaPixelId } from "@/lib/env";

import "../globals.css";

export default function BlogLayout({ children }: Readonly<{ children: ReactNode }>) {
  const metaPixelId = getOptionalMetaPixelId();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <BlogShell>{children}</BlogShell>
        <UmamiAnalytics />
        <MetaPixel pixelId={metaPixelId} />
      </body>
    </html>
  );
}
