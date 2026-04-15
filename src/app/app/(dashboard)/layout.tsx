import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireHouseholdMemberSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await requireHouseholdMemberSession();

  return (
    <AppShell userName={session.user.name ?? session.user.email ?? null} userId={session.user.id}>
      {children}
    </AppShell>
  );
}
