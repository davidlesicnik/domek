import type { ReactNode } from "react";

import { BlogShell } from "@/components/blog/blog-shell";

import "../globals.css";

export default function BlogLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <BlogShell>{children}</BlogShell>
      </body>
    </html>
  );
}
