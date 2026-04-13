import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAppSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { authConfigured, session } = await requireAppSession();

  return (
    <AppShell
      authConfigured={authConfigured}
      userName={session?.user?.name ?? session?.user?.email ?? null}
    >
      {children}
    </AppShell>
  );
}
