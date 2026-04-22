import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { TrialBanner } from "@/components/trial/trial-banner";
import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { ACTIVATION_DAYS, getTrialDaysLeft, getTrialDaysUsed, getTrialState } from "@/lib/trial";

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
      householdId: true,
      household: { select: { createdAt: true, paidAt: true } },
    },
    where: { accountId: session.user.id, household: { deletedAt: null } },
  });

  let banner: ReactNode = null;

  if (membership) {
    const { createdAt, paidAt } = membership.household;
    const state = getTrialState(createdAt, paidAt, !!session.user.developmentAccessGrantedAt);
    const daysLeft = getTrialDaysLeft(createdAt);
    const daysUsed = getTrialDaysUsed(createdAt);

    let memberCount = 1;
    if (state === "trial" && daysUsed >= ACTIVATION_DAYS) {
      memberCount = await prisma.householdMember.count({
        where: { householdId: membership.householdId },
      });
    }

    banner = (
      <TrialBanner
        daysLeft={daysLeft}
        daysUsed={daysUsed}
        memberCount={memberCount}
        state={state}
      />
    );
  }

  return (
    <AppShell
      banner={banner}
      memberColor={membership?.color ?? null}
      memberEmoji={membership?.emoji ?? null}
      userName={session.user.name ?? session.user.email ?? null}
      userId={session.user.id}
    >
      {children}
    </AppShell>
  );
}
