import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { getAppRuntimeConfig } from "@/lib/env";
import { createInvite, listPendingInvites, revokeInvite } from "@/lib/invites";
import { MEMBER_COLOR_KEYS } from "@/lib/member-colors";
import { getFirstHouseholdMembership } from "@/lib/users";
import { HouseholdSettingsView } from "@/components/household/household-settings-view";

export const metadata: Metadata = {
  title: "Household | Domek",
  description: "Manage your household members and invites.",
};

const inviteEmailSchema = z.string().trim().email().max(320);
const memberColorSchema = z.enum(MEMBER_COLOR_KEYS);

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function sendInviteAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    redirect("/app/household?error=forbidden");
  }

  const raw = formData.get("email");
  const parsed = inviteEmailSchema.safeParse(typeof raw === "string" ? raw : "");

  if (!parsed.success) {
    redirect("/app/household?error=email");
  }

  const household = await prisma.household.findUnique({
    where: { id: membership.householdId },
    select: { name: true },
  });

  if (!household) redirect("/app/household");

  const invite = await createInvite({
    householdId: membership.householdId,
    invitedById: session.user.id,
    email: parsed.data,
  });

  const { appUrl } = getAppRuntimeConfig();
  const origin = appUrl ?? "http://localhost:3000";
  const inviteUrl = `${origin}/invite/${invite.token}`;

  await sendInviteEmail({
    toEmail: invite.email,
    inviterName: session.user.name,
    householdName: household.name,
    inviteUrl,
  });

  redirect("/app/household?success=invited");
}

async function revokeInviteAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    redirect("/app/household");
  }

  const inviteId = formData.get("inviteId");
  if (typeof inviteId !== "string" || !inviteId) {
    redirect("/app/household");
  }

  await revokeInvite({ inviteId, householdId: membership.householdId });
  redirect("/app/household");
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

async function updateMemberColorAction(formData: FormData) {
  "use server";

  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) {
    redirect("/onboarding/household");
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    redirect("/app/household");
  }

  if (memberId !== membership.id && membership.role !== "OWNER") {
    redirect("/app/household?error=forbidden");
  }

  const parsedColor = memberColorSchema.safeParse(formData.get("color"));
  if (!parsedColor.success) {
    redirect("/app/household?error=color");
  }

  await prisma.householdMember.updateMany({
    where: {
      id: memberId,
      householdId: membership.householdId,
    },
    data: { color: parsedColor.data },
  });

  revalidatePath("/app/household");
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
        createdAt: true,
        user: { select: { name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    membership.role === "OWNER"
      ? listPendingInvites(membership.householdId)
      : Promise.resolve([]),
  ]);

  const params = (await searchParams) ?? {};
  const successParam = stringParam(params.success);
  const errorParam = stringParam(params.error);

  const successMessage =
    successParam === "invited"
      ? "Invite sent."
      : successParam === "removed"
        ? "Member removed."
        : successParam === "owner"
          ? "Owner reassigned."
          : successParam === "color"
            ? "Color updated."
            : null;
  const errorMessage =
    errorParam === "email"
      ? "Enter a valid email address."
      : errorParam === "forbidden"
        ? "Only the household owner can manage people."
        : errorParam === "confirm"
          ? "Please check the confirmation box."
          : errorParam === "color"
            ? "Choose one of the household colors."
            : null;

  return (
    <HouseholdSettingsView
      householdName={household?.name ?? ""}
      members={members}
      pendingInvites={pendingInvites}
      currentMemberId={membership.id}
      isOwner={membership.role === "OWNER"}
      sendInviteAction={sendInviteAction}
      revokeInviteAction={revokeInviteAction}
      removeMemberAction={removeMemberAction}
      transferOwnershipAction={transferOwnershipAction}
      updateMemberColorAction={updateMemberColorAction}
      deleteHouseholdAction={deleteHouseholdAction}
      leaveHouseholdAction={leaveHouseholdAction}
      successMessage={successMessage}
      errorMessage={errorMessage}
    />
  );
}
