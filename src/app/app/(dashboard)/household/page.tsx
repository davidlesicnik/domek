import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { normalizeMemberEmoji } from "@/lib/member-avatar";
import { isMemberColorKey } from "@/lib/member-colors";
import { getFirstHouseholdMembership } from "@/lib/users";
import { HouseholdSettingsView } from "@/components/household/household-settings-view";

export const metadata: Metadata = {
  title: "Household | Domek",
  description: "Manage your household members and invites.",
};

const memberColorSchema = z.string().refine(isMemberColorKey, "Choose one of the household colors.");

type UpdateMemberAvatarResult = Readonly<{
  error: string | null;
  success: boolean;
}>;

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

  await prisma.householdMember.deleteMany({
    where: {
      id: memberId,
      householdId: membership.householdId,
      role: "MEMBER",
    },
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
        id: memberId,
        householdId: membership.householdId,
        role: "MEMBER",
      },
      select: { id: true },
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

async function updateMemberAvatarAction(formData: FormData): Promise<UpdateMemberAvatarResult> {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) {
    return { error: "Join a household first.", success: false };
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { error: "Choose a household member.", success: false };
  }

  if (memberId !== membership.id && membership.role !== "OWNER") {
    return { error: "Only the household owner can manage people.", success: false };
  }

  const parsedColor = memberColorSchema.safeParse(formData.get("color"));
  if (!parsedColor.success) {
    return { error: "Choose one of the household colors.", success: false };
  }

  const rawEmoji = formData.get("emoji");
  if (typeof rawEmoji !== "string") {
    return { error: "Choose one emoji or leave it blank.", success: false };
  }

  const parsedEmoji = rawEmoji === "" ? null : normalizeMemberEmoji(rawEmoji);
  if (rawEmoji !== "" && !parsedEmoji) {
    return { error: "Choose one emoji or leave it blank.", success: false };
  }

  await prisma.householdMember.updateMany({
    where: {
      id: memberId,
      householdId: membership.householdId,
    },
    data: {
      color: parsedColor.data,
      emoji: parsedEmoji,
    },
  });

  revalidatePath("/app/household");
  revalidatePath("/app");

  return { error: null, success: true };
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

  await prisma.householdMember.delete({ where: { id: membership.id } });
  redirect("/onboarding/household");
}

type HouseholdPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function HouseholdPage({ searchParams }: HouseholdPageProps) {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) redirect("/onboarding/household");

  const [household, members] = await Promise.all([
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
        createdAt: true,
        user: { select: { name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
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
      members={members}
      currentMemberId={membership.id}
      isOwner={membership.role === "OWNER"}
      removeMemberAction={removeMemberAction}
      transferOwnershipAction={transferOwnershipAction}
      updateMemberAvatarAction={updateMemberAvatarAction}
      deleteHouseholdAction={deleteHouseholdAction}
      leaveHouseholdAction={leaveHouseholdAction}
      successMessage={successMessage}
      errorMessage={errorMessage}
    />
  );
}
