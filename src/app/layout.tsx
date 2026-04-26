// Root passthrough — html/body and providers live in [locale]/layout.tsx.
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
