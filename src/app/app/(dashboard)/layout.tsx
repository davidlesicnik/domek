import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await requireHouseholdMemberSession();

  const membership = await prisma.householdMember.findFirst({
    select: {
      color: true,
      emoji: true,
    },
    where: { accountId: session.user.id, household: { deletedAt: null } },
  });

  return (
    <AppShell
      banner={null}
      memberColor={membership?.color ?? null}
      memberEmoji={membership?.emoji ?? null}
      userName={session.user.name ?? session.user.email ?? null}
      userId={session.user.id}
    >
      {children}
    </AppShell>
  );
}
