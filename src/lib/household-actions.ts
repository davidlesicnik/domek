"use server";

import { z } from "zod";

import { requireHouseholdMemberSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { getAppRuntimeConfig } from "@/lib/env";
import { createInvite, revokeInvite } from "@/lib/invites";
import { getFirstHouseholdMembership } from "@/lib/users";

const inviteEmailSchema = z.string().trim().email().max(320);

export type SendInviteState = { ok: true } | { ok: false; error: "email" | "forbidden" | "failed" | "already_member" } | null;

export async function sendHouseholdInvite(
  _prev: SendInviteState,
  formData: FormData,
): Promise<SendInviteState> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") {
    return { ok: false, error: "forbidden" };
  }

  const raw = formData.get("email");
  const parsed = inviteEmailSchema.safeParse(typeof raw === "string" ? raw : "");

  if (!parsed.success) {
    return { ok: false, error: "email" };
  }

  const household = await prisma.household.findUnique({
    where: { id: membership.householdId },
    select: { name: true },
  });

  if (!household) return { ok: false, error: "failed" };

  // Block if the email already belongs to a member of this household
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
    return { ok: false, error: "already_member" };
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
      inviteUrl: `${origin}/invite/${invite.token}`,
    });
  } catch (err) {
    console.error("[sendHouseholdInvite] email failed:", err);
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}

export async function revokeHouseholdInvite(inviteId: string): Promise<void> {
  const session = await requireHouseholdMemberSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership || membership.role !== "OWNER") return;

  await revokeInvite({ inviteId, householdId: membership.householdId });
}
