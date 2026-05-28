"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { getAppRuntimeConfig, getOptionalEmailConfig } from "@/lib/env";
import { createInvite, revokeInvite } from "@/lib/invites";
import { getFirstHouseholdMembership } from "@/lib/users";

const inviteEmailSchema = z.string().trim().email().max(320);

export type InviteActionState = { success: boolean; error: string | null };

export async function sendTopBarInviteAction(
  _prevState: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("householdPage"),
  ]);
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return { success: false, error: t("errorInvitePeopleOwnerOnly") };
  }

  const raw = formData.get("email");
  const parsed = inviteEmailSchema.safeParse(
    typeof raw === "string" ? raw : "",
  );

  if (!parsed.success) {
    return { success: false, error: t("errorValidEmail") };
  }

  const household = await prisma.household.findUnique({
    where: { id: membership.householdId },
    select: { name: true },
  });

  if (!household) return { success: false, error: t("errorHouseholdNotFound") };

  if (!getOptionalEmailConfig()) {
    return {
      success: false,
      error: t("errorInviteSend"),
    };
  }

  const existingMember = await prisma.user.findUnique({
    where: { email: parsed.data.toLowerCase() },
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

  const invite = await createInvite({
    householdId: membership.householdId,
    invitedById: session.user.id,
    email: parsed.data,
  });

  const { appUrl } = getAppRuntimeConfig();
  const origin = appUrl ?? "http://localhost:3000";

  try {
    await sendInviteEmail({
      toEmail: invite.email,
      inviterName: session.user.name,
      householdName: household.name,
      inviteUrl: `${origin}/${locale}/invite/${invite.token}?openApp=1`,
      locale,
    });
  } catch (error) {
    console.error("[sendTopBarInviteAction] email failed:", error);

    return {
      success: false,
      error: t("errorInviteSend"),
    };
  }

  revalidatePath("/app", "layout");
  return { success: true, error: null };
}

export async function revokeTopBarInviteAction(
  formData: FormData,
): Promise<void> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") return;

  const inviteId = formData.get("inviteId");
  if (typeof inviteId !== "string" || !inviteId) return;

  await revokeInvite({ inviteId, householdId: membership.householdId });
  revalidatePath("/app", "layout");
}
