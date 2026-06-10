import { ThemePreference } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
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
  const isOwnerWithMembers =
    membership?.role === "OWNER"
      ? (await prisma.householdMember.count({
          where: { householdId: membership.householdId },
        })) > 1
      : false;

  return {
    hasAppAccess: true,
    isOwnerWithMembers,
    membership,
    user: {
      email: user.email,
      id: user.id,
      image: user.image,
      name: user.name,
      themePreference: user.themePreference,
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

export async function deleteAccount(user: AppUser) {
  const membership = await getFirstHouseholdMembership(user.id);
  if (membership?.role === "OWNER") {
    const memberCount = await prisma.householdMember.count({
      where: { householdId: membership.householdId },
    });

    if (memberCount > 1) {
      return { ok: false as const, reason: "owner_with_members" };
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

  await prisma.$transaction([
    prisma.householdMember.updateMany({
      where: { accountId: user.id },
      data: { accountId: null },
    }),
    prisma.userSession.deleteMany({
      where: { userId: user.id },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
      },
    }),
  ]);

  return { ok: true as const };
}
