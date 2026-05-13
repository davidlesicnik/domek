import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { getAppRuntimeConfig, getOptionalEmailConfig } from "@/lib/env";
import { createInvite, listPendingInvites, revokeInvite } from "@/lib/invites";
import { normalizeMemberEmoji } from "@/lib/member-avatar";
import { isMemberColorKey } from "@/lib/member-colors";
import { getFirstHouseholdMembership, type AppUser } from "@/lib/users";
import { logger } from "@/lib/logger";

const inviteEmailSchema = z.string().trim().email().max(320);
const memberNameSchema = z.string().trim().min(1).max(120);
const memberColorSchema = z.string().refine(isMemberColorKey, "Choose one of the household colors.");
const localeSchema = z.enum(["en", "sl"]).default("en");

export const renameHouseholdInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
  })
  .strict();

export const createPassiveHouseholdMemberInputSchema = z
  .object({
    color: memberColorSchema,
    emoji: z.string().max(16).optional().default(""),
    name: memberNameSchema,
  })
  .strict();

export const sendHouseholdInviteInputSchema = z
  .object({
    email: inviteEmailSchema,
    locale: localeSchema.optional(),
    memberId: z.string().cuid().optional().nullable(),
  })
  .strict();

export const updateHouseholdMemberInputSchema = z
  .object({
    color: memberColorSchema.optional(),
    emoji: z.string().max(16).optional(),
    name: memberNameSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "No changes to save.",
  });

export const confirmInputSchema = z
  .object({
    confirm: z.literal(true),
  })
  .strict();

export function parseRenameHouseholdInput(input: unknown) {
  return renameHouseholdInputSchema.parse(input);
}

export function parseCreatePassiveHouseholdMemberInput(input: unknown) {
  return createPassiveHouseholdMemberInputSchema.parse(input);
}

export function parseSendHouseholdInviteInput(input: unknown) {
  return sendHouseholdInviteInputSchema.parse(input);
}

export function parseUpdateHouseholdMemberInput(input: unknown) {
  return updateHouseholdMemberInputSchema.parse(input);
}

export function parseConfirmInput(input: unknown) {
  return confirmInputSchema.parse(input);
}

type ActiveMembership = NonNullable<Awaited<ReturnType<typeof getFirstHouseholdMembership>>>;

async function getMembership(userId: string): Promise<ActiveMembership | null> {
  return getFirstHouseholdMembership(userId);
}

async function getOwnerMembership(userId: string) {
  const membership = await getMembership(userId);
  if (!membership || membership.role !== "OWNER") {
    return null;
  }

  return membership;
}

function normalizeOptionalEmoji(rawEmoji: string) {
  const emoji = rawEmoji === "" ? null : normalizeMemberEmoji(rawEmoji);
  if (rawEmoji !== "" && !emoji) {
    return { ok: false as const, reason: "emoji" };
  }

  return { ok: true as const, emoji };
}

async function countAssignedChores(householdId: string, memberId: string) {
  return prisma.chore.count({
    where: {
      householdId,
      OR: [{ assignedHouseholdMemberId: memberId }, { rotationMemberIds: { has: memberId } }],
    },
  });
}

async function removeMemberFromCalendarEvents(
  tx: Prisma.TransactionClient,
  householdId: string,
  memberId: string,
) {
  await tx.$executeRaw`
    UPDATE "CalendarEvent"
    SET "householdMemberIds" = array_remove("householdMemberIds", ${memberId})
    WHERE "householdId" = ${householdId}
      AND ${memberId} = ANY("householdMemberIds")
  `;
}

export async function getCurrentHouseholdSettings(user: AppUser) {
  const membership = await getMembership(user.id);
  if (!membership) {
    return null;
  }

  const [household, members, pendingInvites] = await Promise.all([
    prisma.household.findUnique({
      where: { id: membership.householdId },
      select: { id: true, name: true },
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

  if (!household) {
    return null;
  }

  return {
    currentMemberId: membership.id,
    household,
    isOwner: membership.role === "OWNER",
    members: members.map((member) => ({
      accountEmail: member.account?.email ?? null,
      accountId: member.accountId,
      color: member.color,
      createdAt: member.createdAt,
      emoji: member.emoji,
      id: member.id,
      name: member.name,
      role: member.role,
    })),
    pendingInvites,
  };
}

export async function renameHousehold(user: AppUser, input: { name: string }) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  const household = await prisma.household.update({
    where: { id: membership.householdId },
    data: { name: input.name },
    select: { id: true, name: true },
  });

  return { ok: true as const, household };
}

export async function createPassiveHouseholdMember(
  user: AppUser,
  input: { color: string; emoji: string; name: string },
) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  const emojiResult = normalizeOptionalEmoji(input.emoji);
  if (!emojiResult.ok) return emojiResult;

  const member = await prisma.householdMember.create({
    data: {
      color: input.color,
      createdByUserId: user.id,
      emoji: emojiResult.emoji,
      householdId: membership.householdId,
      name: input.name,
      role: "MEMBER",
    },
    select: {
      id: true,
      role: true,
      color: true,
      emoji: true,
      name: true,
      accountId: true,
      createdAt: true,
    },
  });

  return { ok: true as const, member };
}

export async function sendHouseholdInvite(
  user: AppUser,
  input: { email: string; locale?: "en" | "sl"; memberId?: string | null },
) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  const household = await prisma.household.findUnique({
    where: { id: membership.householdId },
    select: { name: true },
  });

  if (!household || !getOptionalEmailConfig()) {
    return { ok: false as const, reason: "invite_send" };
  }

  const email = input.email.toLowerCase();
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
    return { ok: false as const, reason: "already_in_household" };
  }

  if (input.memberId) {
    const targetMember = await prisma.householdMember.findFirst({
      where: {
        accountId: null,
        householdId: membership.householdId,
        id: input.memberId,
      },
      select: { id: true },
    });

    if (!targetMember) {
      return { ok: false as const, reason: "account_already_linked" };
    }
  }

  const invite = await createInvite({
    householdId: membership.householdId,
    householdMemberId: input.memberId ?? null,
    invitedById: user.id,
    email,
  });

  const { appUrl } = getAppRuntimeConfig();
  const origin = appUrl ?? "http://localhost:3000";
  const locale = input.locale ?? "en";

  try {
    await sendInviteEmail({
      householdName: household.name,
      inviteUrl: `${origin}/${locale}/invite/${invite.token}`,
      inviterName: user.name,
      locale,
      toEmail: invite.email,
    });
  } catch (error) {
    logger.error("[sendHouseholdInvite] email failed", { error });
    return { ok: false as const, reason: "invite_send" };
  }

  return { ok: true as const, invite };
}

export async function revokeHouseholdInvite(user: AppUser, inviteId: string) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  await revokeInvite({ inviteId, householdId: membership.householdId });
  return { ok: true as const };
}

export async function updateHouseholdMember(
  user: AppUser,
  memberId: string,
  input: { color?: string; emoji?: string; name?: string },
) {
  const membership = await getMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "join_household_first" };
  }

  if (memberId !== membership.id && membership.role !== "OWNER") {
    return { ok: false as const, reason: "forbidden" };
  }

  const data: { color?: string; emoji?: string | null; name?: string } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.color !== undefined) {
    data.color = input.color;
  }

  if (input.emoji !== undefined) {
    const emojiResult = normalizeOptionalEmoji(input.emoji);
    if (!emojiResult.ok) return emojiResult;
    data.emoji = emojiResult.emoji;
  }

  const member = await prisma.householdMember.updateMany({
    where: {
      householdId: membership.householdId,
      id: memberId,
    },
    data,
  });

  if (member.count === 0) {
    return { ok: false as const, reason: "member_not_found" };
  }

  return { ok: true as const };
}

export async function removeHouseholdMember(user: AppUser, memberId: string) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  if (!memberId || memberId === membership.id) {
    return { ok: false as const, reason: "invalid_member" };
  }

  const assignedChoreCount = await countAssignedChores(membership.householdId, memberId);

  if (assignedChoreCount > 0) {
    return { ok: false as const, reason: "assigned_chores" };
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

    await removeMemberFromCalendarEvents(tx, membership.householdId, memberId);

    await tx.householdMember.deleteMany({
      where: {
        id: memberId,
        householdId: membership.householdId,
        role: "MEMBER",
      },
    });
  });

  return { ok: true as const };
}

export async function transferHouseholdOwnership(user: AppUser, memberId: string) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  if (!memberId || memberId === membership.id) {
    return { ok: false as const, reason: "invalid_member" };
  }

  let transferred = false;

  await prisma.$transaction(async (tx) => {
    const targetMember = await tx.householdMember.findFirst({
      where: {
        accountId: { not: null },
        id: memberId,
        householdId: membership.householdId,
        role: "MEMBER",
      },
      select: { id: true },
    });

    if (!targetMember) {
      return;
    }

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

    transferred = true;
  });

  if (!transferred) {
    return { ok: false as const, reason: "member_not_found" };
  }

  return { ok: true as const };
}

export async function deleteHousehold(user: AppUser) {
  const membership = await getOwnerMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "forbidden" };
  }

  await prisma.$transaction([
    prisma.householdMember.deleteMany({ where: { householdId: membership.householdId } }),
    prisma.household.update({
      where: { id: membership.householdId },
      data: { deletedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}

export async function leaveHousehold(user: AppUser) {
  const membership = await getMembership(user.id);
  if (!membership) {
    return { ok: false as const, reason: "not_found" };
  }

  if (membership.role === "OWNER") {
    return { ok: false as const, reason: "owner_cannot_leave" };
  }

  const assignedChoreCount = await countAssignedChores(
    membership.householdId,
    membership.id,
  );

  if (assignedChoreCount > 0) {
    return { ok: false as const, reason: "assigned_chores" };
  }

  await prisma.$transaction(async (tx) => {
    await removeMemberFromCalendarEvents(tx, membership.householdId, membership.id);

    await tx.householdMember.delete({ where: { id: membership.id } });
  });

  return { ok: true as const };
}
