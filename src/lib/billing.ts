import { BillingSubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

const accessStatuses = new Set<BillingSubscriptionStatus>([
  BillingSubscriptionStatus.TRIALING,
  BillingSubscriptionStatus.ACTIVE,
]);

export function billingStatusHasAccess(
  status: BillingSubscriptionStatus | null | undefined,
): boolean {
  return status ? accessStatuses.has(status) : false;
}

export async function getUserBillingSubscription(userId: string) {
  return prisma.billingSubscription.findUnique({
    select: {
      householdId: true,
      id: true,
      paddleCustomerId: true,
      paddleSubscriptionId: true,
      status: true,
      trialEndsAt: true,
    },
    where: { userId },
  });
}

export async function getHouseholdBillingSubscription(householdId: string) {
  return prisma.billingSubscription.findUnique({
    select: {
      id: true,
      paddleSubscriptionId: true,
      status: true,
      trialEndsAt: true,
    },
    where: { householdId },
  });
}
