import { BillingSubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

export const TRIAL_DAYS = 30;
const TRIAL_WINDOW_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

const accessStatuses = new Set<BillingSubscriptionStatus>([
  BillingSubscriptionStatus.TRIALING,
  BillingSubscriptionStatus.ACTIVE,
]);

type AccessUser = {
  trialStartedAt: Date | null;
  billingSubscription: { status: BillingSubscriptionStatus } | null;
  developmentAccessGrantedAt: Date | null;
};

export function billingStatusHasAccess(
  status: BillingSubscriptionStatus | null | undefined,
): boolean {
  return status ? accessStatuses.has(status) : false;
}

export function hasAccess(
  user: AccessUser,
): boolean {
  if (user.developmentAccessGrantedAt) {
    return true;
  }

  if (user.billingSubscription) {
    return billingStatusHasAccess(user.billingSubscription.status);
  }

  if (user.trialStartedAt) {
    return Date.now() < user.trialStartedAt.getTime() + TRIAL_WINDOW_MS;
  }

  return false;
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
