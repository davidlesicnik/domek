"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { getAppRuntimeConfig, getOptionalEmailConfig } from "@/lib/env";
import { createInvite, revokeInvite } from "@/lib/invites";
import { normalizeMemberEmoji } from "@/lib/member-avatar";
import { isMemberColorKey } from "@/lib/member-colors";
import { getFirstHouseholdMembership } from "@/lib/users";

const inviteEmailSchema = z.string().trim().email().max(320);
const memberNameSchema = z.string().trim().min(1).max(120);
const memberColorSchema = z.string().refine(isMemberColorKey, "Choose one of the household colors.");

export type HouseholdActionState = Readonly<{
  error: string | null;
  success: boolean;
}>;

export type UpdateHouseholdMemberResult = Readonly<{
  error: string | null;
  success: boolean;
}>;

function refreshHouseholdViews() {
  revalidatePath("/app", "layout");
  revalidatePath("/app");
  revalidatePath("/app/household");
}

export async function sendHouseholdMemberInviteAction(
  _prevState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return { success: false, error: "Only the household owner can add people." };
  }

  const parsedEmail = inviteEmailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { success: false, error: "Enter a valid email address." };
  }

  const rawMemberId = formData.get("memberId");
  const targetMemberId = typeof rawMemberId === "string" && rawMemberId ? rawMemberId : null;

  const household = await prisma.household.findUnique({
    where: { id: membership.householdId },
    select: { name: true },
  });

  if (!household || !getOptionalEmailConfig()) {
    return {
      success: false,
      error: "We couldn't send the invite right now. Please try again in a bit.",
    };
  }

  const email = parsedEmail.data.toLowerCase();
  const existingMember = await prisma.user.findUnique({
    where: { email },
    select: {
      memberships: {
        where: { householdId: membership.householdId },
        select: { id: true },
      },
    },
  });

  if (existingMember?.memberships.length) {
    return { success: false, error: "That person is already in this household." };
  }

  if (targetMemberId) {
    const targetMember = await prisma.householdMember.findFirst({
      where: {
        accountId: null,
        householdId: membership.householdId,
        id: targetMemberId,
      },
      select: { id: true },
    });

    if (!targetMember) {
      return { success: false, error: "This person already has an account linked." };
    }
  }

  const invite = await createInvite({
    householdId: membership.householdId,
    householdMemberId: targetMemberId,
    invitedById: session.user.id,
    email,
  });

  const { appUrl } = getAppRuntimeConfig();
  const origin = appUrl ?? "http://localhost:3000";

  try {
    await sendInviteEmail({
      toEmail: invite.email,
      inviterName: session.user.name,
      householdName: household.name,
      inviteUrl: `${origin}/invite/${invite.token}`,
    });
  } catch (error) {
    console.error("[sendHouseholdMemberInviteAction] email failed:", error);
    return {
      success: false,
      error: "We couldn't send the invite right now. Please try again in a bit.",
    };
  }

  refreshHouseholdViews();
  return { success: true, error: null };
}

export async function createPassiveHouseholdMemberAction(
  _prevState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return { success: false, error: "Only the household owner can add people." };
  }

  const parsedName = memberNameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) {
    return { success: false, error: "Add a name for this person." };
  }

  const parsedColor = memberColorSchema.safeParse(formData.get("color"));
  if (!parsedColor.success) {
    return { success: false, error: "Choose one of the household colors." };
  }

  const rawEmoji = formData.get("emoji");
  if (typeof rawEmoji !== "string") {
    return { success: false, error: "Choose one emoji or leave it blank." };
  }

  const emoji = rawEmoji === "" ? null : normalizeMemberEmoji(rawEmoji);
  if (rawEmoji !== "" && !emoji) {
    return { success: false, error: "Choose one emoji or leave it blank." };
  }

  await prisma.householdMember.create({
    data: {
      color: parsedColor.data,
      createdByUserId: session.user.id,
      emoji,
      householdId: membership.householdId,
      name: parsedName.data,
      role: "MEMBER",
    },
  });

  refreshHouseholdViews();
  return { success: true, error: null };
}

export async function revokeHouseholdMemberInviteAction(formData: FormData): Promise<void> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") return;

  const inviteId = formData.get("inviteId");
  if (typeof inviteId !== "string" || !inviteId) return;

  await revokeInvite({ inviteId, householdId: membership.householdId });
  refreshHouseholdViews();
}

export async function updateHouseholdMemberAction(
  formData: FormData,
): Promise<UpdateHouseholdMemberResult> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) {
    return { success: false, error: "Join a household first." };
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { success: false, error: "Choose a household member." };
  }

  if (memberId !== membership.id && membership.role !== "OWNER") {
    return { success: false, error: "Only the household owner can manage people." };
  }

  const data: { color?: string; emoji?: string | null; name?: string } = {};

  if (formData.has("name")) {
    const parsedName = memberNameSchema.safeParse(formData.get("name"));
    if (!parsedName.success) {
      return { success: false, error: "Add a name for this person." };
    }
    data.name = parsedName.data;
  }

  if (formData.has("color")) {
    const parsedColor = memberColorSchema.safeParse(formData.get("color"));
    if (!parsedColor.success) {
      return { success: false, error: "Choose one of the household colors." };
    }
    data.color = parsedColor.data;
  }

  if (formData.has("emoji")) {
    const rawEmoji = formData.get("emoji");
    if (typeof rawEmoji !== "string") {
      return { success: false, error: "Choose one emoji or leave it blank." };
    }

    const emoji = rawEmoji === "" ? null : normalizeMemberEmoji(rawEmoji);
    if (rawEmoji !== "" && !emoji) {
      return { success: false, error: "Choose one emoji or leave it blank." };
    }

    data.emoji = emoji;
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: "No changes to save." };
  }

  await prisma.householdMember.updateMany({
    where: {
      householdId: membership.householdId,
      id: memberId,
    },
    data,
  });

  refreshHouseholdViews();
  return { success: true, error: null };
}
