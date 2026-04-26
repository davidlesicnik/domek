import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("householdPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function removeMemberAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return await redirect("/app/household?error=forbidden");
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId || memberId === membership.id) {
    return await redirect("/app/household");
  }

  const assignedChoreCount = await prisma.chore.count({
    where: {
      householdId: membership.householdId,
      OR: [{ assignedHouseholdMemberId: memberId }, { rotationMemberIds: { has: memberId } }],
    },
  });

  if (assignedChoreCount > 0) {
    return await redirect("/app/household?error=assigned-chores");
  }

  await prisma.$transaction(async (tx) => {
    await tx.householdInvite.updateMany({
      where: {
        householdId: membership.householdId,
        householdMemberId: memberId,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

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

  return await redirect("/app/household?success=removed");
}

async function transferOwnershipAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return await redirect("/app/household?error=forbidden");
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId || memberId === membership.id) {
    return await redirect("/app/household");
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

  return await redirect("/app/household?success=owner");
}

async function deleteHouseholdAction(formData: FormData) {
  "use server";

  const confirm = formData.get("confirm");
  if (confirm !== "yes") return await redirect("/app/household?error=confirm");

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") return await redirect("/app/household");

  await prisma.$transaction([
    prisma.householdMember.deleteMany({ where: { householdId: membership.householdId } }),
    prisma.household.update({
      where: { id: membership.householdId },
      data: { deletedAt: new Date() },
    }),
  ]);
  return await redirect("/onboarding/household");
}

async function leaveHouseholdAction() {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role === "OWNER") return await redirect("/app/household");

  const assignedChoreCount = await prisma.chore.count({
    where: {
      householdId: membership.householdId,
      OR: [
        { assignedHouseholdMemberId: membership.id },
        { rotationMemberIds: { has: membership.id } },
      ],
    },
  });

  if (assignedChoreCount > 0) {
    return await redirect("/app/household?error=assigned-chores");
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
  return await redirect("/onboarding/household");
}

type HouseholdPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function HouseholdPage({ searchParams }: HouseholdPageProps) {
  const [session, t] = await Promise.all([
    requireHouseholdMemberSession(),
    getTranslations("householdPage"),
  ]);
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) return await redirect("/onboarding/household");

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
      ? t("successRemoved")
      : successParam === "owner"
        ? t("successOwner")
        : successParam === "color"
          ? t("successColor")
          : null;
  const errorMessage =
    errorParam === "forbidden"
      ? t("errorForbidden")
      : errorParam === "confirm"
        ? t("errorConfirm")
        : errorParam === "color"
          ? t("errorColor")
          : errorParam === "assigned-chores"
            ? t("errorAssignedChores")
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
      linkAccountAction={sendHouseholdMemberInviteAction}
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
