import { BillingSubscriptionStatus, ThemePreference } from "@prisma/client";
import { z } from "zod";

import { hasAccess } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { getOptionalPaddleServerConfig } from "@/lib/env";
import {
  cancelPaddleSubscriptionAtPeriodEnd,
  cancelPaddleSubscriptionImmediately,
  PaddleSubscriptionCancelError,
} from "@/lib/paddle-server";
import { createSupabaseAccessTokenClient } from "@/lib/supabase";
import { isThemePreference } from "@/lib/theme";
import { getFirstHouseholdMembership, type AppUser } from "@/lib/users";

const deleteAccountInputSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict();

const updateAccountInputSchema = z
  .object({
    themePreference: z.custom<ThemePreference>(isThemePreference),
  })
  .strict();

export function parseDeleteAccountInput(input: unknown) {
  return deleteAccountInputSchema.parse(input);
}

export function parseUpdateAccountInput(input: unknown) {
  return updateAccountInputSchema.parse(input);
}

export async function getAccountSettings(user: AppUser) {
  const membership = await getFirstHouseholdMembership(user.id);
  const billingSubscription = await prisma.billingSubscription.findUnique({
    select: {
      canceledAt: true,
      currentPeriodEndsAt: true,
      scheduledCancellationAt: true,
      startedAt: true,
      status: true,
      trialEndsAt: true,
    },
    where: { userId: user.id },
  });
  const householdBillingSubscription = membership
    ? await prisma.billingSubscription.findUnique({
        select: { status: true },
        where: { householdId: membership.householdId },
      })
    : null;

  const isOwnerWithMembers =
    membership?.role === "OWNER"
      ? (await prisma.householdMember.count({
          where: { householdId: membership.householdId },
        })) > 1
      : false;

  return {
    billingSubscription,
    hasAppAccess: hasAccess({
      billingSubscription: householdBillingSubscription ?? billingSubscription,
      developmentAccessGrantedAt: user.developmentAccessGrantedAt,
      trialStartedAt: user.trialStartedAt,
    }),
    isOwnerWithMembers,
    membership,
    user: {
      email: user.email,
      id: user.id,
      image: user.image,
      name: user.name,
      themePreference: user.themePreference,
      trialStartedAt: user.trialStartedAt,
    },
  };
}

export async function updateAccountThemePreference(userId: string, input: { themePreference: ThemePreference }) {
  return prisma.user.update({
    data: { themePreference: input.themePreference },
    select: { themePreference: true },
    where: { id: userId },
  });
}

export async function cancelAccountSubscription(userId: string) {
  const billingSubscription = await prisma.billingSubscription.findUnique({
    select: {
      id: true,
      paddleSubscriptionId: true,
      status: true,
      scheduledCancellationAt: true,
    },
    where: { userId },
  });

  if (
    !billingSubscription?.paddleSubscriptionId ||
    billingSubscription.status === BillingSubscriptionStatus.CANCELED ||
    billingSubscription.scheduledCancellationAt
  ) {
    return { ok: true as const, subscription: billingSubscription };
  }

  const paddleServer = getOptionalPaddleServerConfig();
  if (!paddleServer) {
    return { ok: false as const, reason: "billing_not_configured" };
  }

  try {
    const updatedSubscription = await cancelPaddleSubscriptionAtPeriodEnd({
      apiKey: paddleServer.apiKey,
      clientToken: paddleServer.clientToken,
      subscriptionId: billingSubscription.paddleSubscriptionId,
    });

    const subscription = await prisma.billingSubscription.update({
      data: {
        canceledAt: updatedSubscription.canceledAt,
        currentPeriodEndsAt: updatedSubscription.currentPeriodEndsAt,
        scheduledCancellationAt: updatedSubscription.scheduledCancellationAt,
        status: updatedSubscription.status,
      },
      select: {
        canceledAt: true,
        currentPeriodEndsAt: true,
        scheduledCancellationAt: true,
        startedAt: true,
        status: true,
        trialEndsAt: true,
      },
      where: { id: billingSubscription.id },
    });

    return { ok: true as const, subscription };
  } catch (error) {
    if (error instanceof PaddleSubscriptionCancelError) {
      return { ok: false as const, reason: "subscription_cancel_failed" };
    }

    throw error;
  }
}

export async function deleteAccount(user: AppUser, accessToken?: string | null) {
  const membership = await getFirstHouseholdMembership(user.id);
  if (membership?.role === "OWNER") {
    const memberCount = await prisma.householdMember.count({
      where: { householdId: membership.householdId },
    });

    if (memberCount > 1) {
      return { ok: false as const, reason: "owner_with_members" };
    }
  }

  const billingSubscription = await prisma.billingSubscription.findUnique({
    select: {
      id: true,
      paddleSubscriptionId: true,
      status: true,
    },
    where: { userId: user.id },
  });

  if (
    billingSubscription?.paddleSubscriptionId &&
    billingSubscription.status !== BillingSubscriptionStatus.CANCELED
  ) {
    const paddleServer = getOptionalPaddleServerConfig();
    if (!paddleServer) {
      return { ok: false as const, reason: "billing_not_configured" };
    }

    try {
      const canceledSubscription = await cancelPaddleSubscriptionImmediately({
        apiKey: paddleServer.apiKey,
        clientToken: paddleServer.clientToken,
        subscriptionId: billingSubscription.paddleSubscriptionId,
      });

      await prisma.billingSubscription.update({
        data: {
          canceledAt: canceledSubscription.canceledAt ?? new Date(),
          currentPeriodEndsAt: canceledSubscription.currentPeriodEndsAt,
          scheduledCancellationAt: canceledSubscription.scheduledCancellationAt,
          status: canceledSubscription.status,
        },
        where: { id: billingSubscription.id },
      });
    } catch (error) {
      if (error instanceof PaddleSubscriptionCancelError) {
        return { ok: false as const, reason: "billing_cancel_failed" };
      }

      throw error;
    }
  }

  if (membership?.role === "OWNER") {
    await prisma.$transaction([
      prisma.householdMember.deleteMany({ where: { householdId: membership.householdId } }),
      prisma.household.update({
        where: { id: membership.householdId },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  await prisma.householdMember.updateMany({
    where: { accountId: user.id },
    data: { accountId: null },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deletedAt: new Date(),
      developmentAccessGrantedAt: null,
    },
  });

  if (accessToken) {
    await createSupabaseAccessTokenClient(accessToken).auth.signOut();
  }

  return { ok: true as const };
}
