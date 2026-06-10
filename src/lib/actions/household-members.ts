"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { getAppRuntimeConfig, getOptionalEmailConfig } from "@/lib/env";
import { createInvite, revokeInvite } from "@/lib/invites";
import { normalizeMemberEmoji } from "@/lib/member-avatar";
import { isMemberColorKey } from "@/lib/member-colors";
import { getFirstHouseholdMembership } from "@/lib/users";
import { logger } from "@/lib/logger";

const inviteEmailSchema = z.string().trim().email().max(320);
const memberNameSchema = z.string().trim().min(1).max(120);
const memberColorSchema = z
  .string()
  .refine(isMemberColorKey, "Choose one of the household colors.");

export type HouseholdActionState = Readonly<{
  error: string | null;
  inviteUrl?: string | null;
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
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("householdPage"),
  ]);
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return { success: false, error: t("errorAddPeopleOwnerOnly") };
  }

  const parsedEmail = inviteEmailSchema.safeParse(formData.get("email"));
  if (!parsedEmail.success) {
    return { success: false, error: t("errorValidEmail") };
  }

  const rawMemberId = formData.get("memberId");
  const targetMemberId =
    typeof rawMemberId === "string" && rawMemberId ? rawMemberId : null;

  const household = await prisma.household.findUnique({
    where: { id: membership.householdId },
    select: { name: true },
  });

  if (!household) {
    return {
      success: false,
      error: t("errorHouseholdNotFound"),
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
    return { success: false, error: t("errorAlreadyInHousehold") };
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
      return { success: false, error: t("errorAccountAlreadyLinked") };
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
  const inviteUrl = `${origin}/${locale}/invite/${invite.token}?openApp=1`;

  if (!getOptionalEmailConfig()) {
    refreshHouseholdViews();
    return { success: true, error: null, inviteUrl };
  }

  try {
    await sendInviteEmail({
      toEmail: invite.email,
      inviterName: session.user.name,
      householdName: household.name,
      inviteUrl,
      locale,
    });
  } catch (error) {
    logger.error("[sendHouseholdMemberInviteAction] email failed", { error });
    return {
      success: true,
      error: null,
      inviteUrl,
    };
  }

  refreshHouseholdViews();
  return { success: true, error: null, inviteUrl: null };
}

export async function createPassiveHouseholdMemberAction(
  _prevState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const t = await getTranslations("householdPage");
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return { success: false, error: t("errorAddPeopleOwnerOnly") };
  }

  const parsedName = memberNameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) {
    return { success: false, error: t("errorNameRequired") };
  }

  const parsedColor = memberColorSchema.safeParse(formData.get("color"));
  if (!parsedColor.success) {
    return { success: false, error: t("errorColor") };
  }

  const rawEmoji = formData.get("emoji");
  if (typeof rawEmoji !== "string") {
    return { success: false, error: t("errorEmoji") };
  }

  const emoji = rawEmoji === "" ? null : normalizeMemberEmoji(rawEmoji);
  if (rawEmoji !== "" && !emoji) {
    return { success: false, error: t("errorEmoji") };
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

export async function revokeHouseholdMemberInviteAction(
  formData: FormData,
): Promise<void> {
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
  const t = await getTranslations("householdPage");
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership) {
    return { success: false, error: t("errorJoinHouseholdFirst") };
  }

  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) {
    return { success: false, error: t("errorChooseMember") };
  }

  if (memberId !== membership.id && membership.role !== "OWNER") {
    return { success: false, error: t("errorForbidden") };
  }

  const data: { color?: string; emoji?: string | null; name?: string } = {};

  if (formData.has("name")) {
    const parsedName = memberNameSchema.safeParse(formData.get("name"));
    if (!parsedName.success) {
      return { success: false, error: t("errorNameRequired") };
    }
    data.name = parsedName.data;
  }

  if (formData.has("color")) {
    const parsedColor = memberColorSchema.safeParse(formData.get("color"));
    if (!parsedColor.success) {
      return { success: false, error: t("errorColor") };
    }
    data.color = parsedColor.data;
  }

  if (formData.has("emoji")) {
    const rawEmoji = formData.get("emoji");
    if (typeof rawEmoji !== "string") {
      return { success: false, error: t("errorEmoji") };
    }

    const emoji = rawEmoji === "" ? null : normalizeMemberEmoji(rawEmoji);
    if (rawEmoji !== "" && !emoji) {
      return { success: false, error: t("errorEmoji") };
    }

    data.emoji = emoji;
  }

  if (Object.keys(data).length === 0) {
    return { success: false, error: t("errorNoChanges") };
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
