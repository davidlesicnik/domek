import { ThemePreference } from "@prisma/client";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { prisma } from "@/lib/db";

export type AppUser = Readonly<{
  developmentAccessGrantedAt: Date | null;
  trialStartedAt: Date | null;
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  themePreference: ThemePreference;
}>;

const userSelect = {
  developmentAccessGrantedAt: true,
  trialStartedAt: true,
  email: true,
  id: true,
  image: true,
  name: true,
  themePreference: true,
} as const;

function stringMetadata(user: SupabaseAuthUser, key: string): string | null {
  const value = user.user_metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function userName(user: SupabaseAuthUser): string | null {
  return (
    stringMetadata(user, "full_name") ??
    stringMetadata(user, "name") ??
    stringMetadata(user, "preferred_username") ??
    user.email ??
    null
  );
}

function userImage(user: SupabaseAuthUser): string | null {
  return stringMetadata(user, "avatar_url") ?? stringMetadata(user, "picture");
}

export async function upsertSupabaseUser(user: SupabaseAuthUser) {
  const data = {
    email: user.email ?? null,
    id: user.id,
    image: userImage(user),
    name: userName(user),
  };

  return prisma.user.upsert({
    create: data,
    select: { ...userSelect, deletedAt: true },
    update: {
      deletedAt: null,
      email: data.email,
      image: data.image,
      name: data.name,
    },
    where: { id: data.id },
  });
}

export async function ensureTrialStartedAt(user: AppUser): Promise<AppUser> {
  if (user.trialStartedAt) {
    return user;
  }

  const now = new Date();
  const updateResult = await prisma.user.updateMany({
    data: { trialStartedAt: now },
    where: { id: user.id, trialStartedAt: null },
  });

  if (updateResult.count > 0) {
    return { ...user, trialStartedAt: now };
  }

  const currentUser = await prisma.user.findUnique({
    select: { trialStartedAt: true },
    where: { id: user.id },
  });

  return { ...user, trialStartedAt: currentUser?.trialStartedAt ?? null };
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
