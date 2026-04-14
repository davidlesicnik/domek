import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasAuthRuntimeConfig } from "@/lib/env";

export type UserScope = Readonly<{
  create: { createdByUserId?: string; householdId?: string };
  where: { createdByUserId?: string | null; householdId?: string | null };
}>;

export async function getCurrentUserScope(): Promise<UserScope | null> {
  if (!hasAuthRuntimeConfig()) {
    return {
      create: {},
      where: { createdByUserId: null, householdId: null },
    };
  }

  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    select: {
      id: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        select: { householdId: true },
        take: 1,
      },
    },
    where: { email: session.user.email },
  });

  if (!user) {
    return null;
  }

  const householdId = user.memberships[0]?.householdId;

  if (householdId) {
    return {
      create: { createdByUserId: user.id, householdId },
      where: { householdId },
    };
  }

  return {
    create: { createdByUserId: user.id },
    where: { createdByUserId: user.id, householdId: null },
  };
}
