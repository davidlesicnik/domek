import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireHouseholdMemberSession } from "@/lib/authz";
import {
  createPassiveHouseholdMemberAction,
  revokeHouseholdMemberInviteAction,
  sendHouseholdMemberInviteAction,
  updateHouseholdMemberAction,
} from "@/lib/actions/household-members";
import { prisma } from "@/lib/db";
import { listPendingInvites } from "@/lib/invites";
import { getFirstHouseholdMembership } from "@/lib/users";
import { HouseholdSettingsView } from "@/components/household/household-settings-view";

export const metadata: Metadata = {
  title: "Household | Domek",
  description: "Manage your household members and invites.",
};

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function removeMemberAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    redirect("/app/household?error=forbidden");
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId || memberId === membership.id) {
    redirect("/app/household");
  }

  const assignedChoreCount = await prisma.chore.count({
    where: {
      householdId: membership.householdId,
      OR: [{ assignedHouseholdMemberId: memberId }, { rotationMemberIds: { has: memberId } }],
    },
  });

  if (assignedChoreCount > 0) {
    redirect("/app/household?error=assigned-chores");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "CalendarEvent"
      SET "householdMemberIds" = array_remove("householdMemberIds", ${memberId})
      WHERE "householdId" = ${membership.householdId}
        AND ${memberId} = ANY("householdMemberIds")
    `;

    await tx.householdMember.deleteMany({
      where: {
        id: memberId,
        householdId: membership.householdId,
        role: "MEMBER",
      },
    });
  });

  redirect("/app/household?success=removed");
}

async function transferOwnershipAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    redirect("/app/household?error=forbidden");
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId || memberId === membership.id) {
    redirect("/app/household");
  }

  await prisma.$transaction(async (tx) => {
    const targetMember = await tx.householdMember.findFirst({
      where: {
        accountId: { not: null },
        id: memberId,
        householdId: membership.householdId,
        role: "MEMBER",
      },
      select: { id: true, accountId: true },
    });

    if (!targetMember) return;

    await tx.householdMember.updateMany({
      where: {
        householdId: membership.householdId,
        role: "OWNER",
      },
      data: { role: "MEMBER" },
    });

    await tx.householdMember.update({
      where: { id: targetMember.id },
      data: { role: "OWNER" },
    });
  });

  redirect("/app/household?success=owner");
}

async function deleteHouseholdAction(formData: FormData) {
  "use server";

  const confirm = formData.get("confirm");
  if (confirm !== "yes") redirect("/app/household?error=confirm");

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") redirect("/app/household");

  await prisma.$transaction([
    prisma.householdMember.deleteMany({ where: { householdId: membership.householdId } }),
    prisma.household.update({
      where: { id: membership.householdId },
      data: { deletedAt: new Date() },
    }),
  ]);
  redirect("/onboarding/household");
}

async function leaveHouseholdAction() {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role === "OWNER") redirect("/app/household");

  const assignedChoreCount = await prisma.chore.count({
    where: {
      householdId: membership.householdId,
      OR: [{ assignedHouseholdMemberId: membership.id }, { rotationMemberIds: { has: membership.id } }],
    },
  });

  if (assignedChoreCount > 0) {
    redirect("/app/household?error=assigned-chores");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "CalendarEvent"
      SET "householdMemberIds" = array_remove("householdMemberIds", ${membership.id})
      WHERE "householdId" = ${membership.householdId}
        AND ${membership.id} = ANY("householdMemberIds")
    `;

    await tx.householdMember.delete({ where: { id: membership.id } });
  });
  redirect("/onboarding/household");
}

type HouseholdPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function HouseholdPage({ searchParams }: HouseholdPageProps) {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) redirect("/onboarding/household");

  const [household, members, pendingInvites] = await Promise.all([
    prisma.household.findUnique({
      where: { id: membership.householdId },
      select: { name: true },
    }),
    prisma.householdMember.findMany({
      where: { householdId: membership.householdId },
      select: {
        id: true,
        role: true,
        color: true,
        emoji: true,
        name: true,
        accountId: true,
        createdAt: true,
        account: { select: { email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    membership.role === "OWNER" ? listPendingInvites(membership.householdId) : Promise.resolve([]),
  ]);

  const params = (await searchParams) ?? {};
  const successParam = stringParam(params.success);
  const errorParam = stringParam(params.error);

  const successMessage =
    successParam === "removed"
      ? "Member removed."
      : successParam === "owner"
        ? "Owner reassigned."
        : successParam === "color"
          ? "Avatar updated."
          : null;
  const errorMessage =
    errorParam === "forbidden"
      ? "Only the household owner can manage people."
      : errorParam === "confirm"
        ? "Please check the confirmation box."
        : errorParam === "color"
          ? "Choose one of the household colors."
          : errorParam === "assigned-chores"
            ? "Reassign this person's chores before removing them from the household."
          : null;

  return (
    <HouseholdSettingsView
      householdName={household?.name ?? ""}
      members={members.map((member) => ({
        accountEmail: member.account?.email ?? null,
        accountId: member.accountId,
        color: member.color,
        createdAt: member.createdAt,
        emoji: member.emoji,
        id: member.id,
        name: member.name,
        role: member.role,
      }))}
      pendingInvites={pendingInvites}
      currentMemberId={membership.id}
      isOwner={membership.role === "OWNER"}
      createMemberAction={createPassiveHouseholdMemberAction}
      sendInviteAction={sendHouseholdMemberInviteAction}
      revokeInviteAction={revokeHouseholdMemberInviteAction}
      removeMemberAction={removeMemberAction}
      transferOwnershipAction={transferOwnershipAction}
      updateMemberAction={updateHouseholdMemberAction}
      deleteHouseholdAction={deleteHouseholdAction}
      leaveHouseholdAction={leaveHouseholdAction}
      successMessage={successMessage}
      errorMessage={errorMessage}
    />
  );
}
