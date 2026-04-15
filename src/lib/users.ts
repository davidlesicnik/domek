import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

import { prisma } from "@/lib/db";

export type AppUser = Readonly<{
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}>;

const userSelect = {
  email: true,
  id: true,
  image: true,
  name: true,
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

export async function getFirstHouseholdMembership(userId: string) {
  return prisma.householdMember.findFirst({
    select: {
      householdId: true,
      id: true,
      role: true,
    },
    where: { userId, household: { deletedAt: null } },
  });
}

export async function hasHouseholdMembership(userId: string): Promise<boolean> {
  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { userId, household: { deletedAt: null } },
  });

  return Boolean(membership);
}
