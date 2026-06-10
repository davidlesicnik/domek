import { ThemePreference } from "@prisma/client";

import { prisma } from "@/lib/db";

export type AppUser = Readonly<{
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  themePreference: ThemePreference;
}>;

export const appUserSelect = {
  email: true,
  id: true,
  image: true,
  name: true,
  themePreference: true,
} as const;

export async function createUser(input: {
  email: string;
  name?: string | null;
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      id: crypto.randomUUID(),
      name: input.name?.trim() || input.email,
    },
    select: appUserSelect,
  });
}

export async function getAppUserById(userId: string) {
  return prisma.user.findFirst({
    select: appUserSelect,
    where: {
      deletedAt: null,
      id: userId,
    },
  });
}

export async function getFirstHouseholdMembership(userId: string) {
  return prisma.householdMember.findFirst({
    select: {
      household: {
        select: {
          name: true,
        },
      },
      householdId: true,
      id: true,
      role: true,
    },
    where: { accountId: userId, household: { deletedAt: null } },
  });
}

export async function hasHouseholdMembership(userId: string): Promise<boolean> {
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { accountId: userId, household: { deletedAt: null } },
  });

  return Boolean(membership);
}
