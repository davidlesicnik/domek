import { randomBytes } from "crypto";

import { prisma } from "@/lib/db";

const INVITE_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createInvite({
  householdId,
  invitedById,
  email,
}: {
  householdId: string;
  invitedById: string;
  email: string;
}) {
  const normalizedEmail = email.toLowerCase().trim();

  // Revoke any existing pending invite for this email+household to prevent duplicate valid links
  await prisma.householdInvite.updateMany({
    where: { householdId, email: normalizedEmail, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const token = generateToken();

  return prisma.householdInvite.create({
    data: { token, email: normalizedEmail, householdId, invitedById, expiresAt },
    select: { id: true, token: true, email: true, expiresAt: true },
  });
}

export async function listPendingInvites(householdId: string) {
  return prisma.householdInvite.findMany({
    where: { householdId, status: "PENDING" },
    select: { id: true, email: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeInvite({
  inviteId,
  householdId,
}: {
  inviteId: string;
  householdId: string;
}) {
  return prisma.householdInvite.updateMany({
    where: { id: inviteId, householdId, status: "PENDING" },
    data: { status: "REVOKED" },
  });
}

export async function getInvitePreview(token: string) {
  return prisma.householdInvite.findUnique({
    where: { token },
    select: {
      status: true,
      expiresAt: true,
      email: true,
      household: { select: { name: true, deletedAt: true } },
      invitedBy: { select: { name: true } },
    },
  });
}

export type InviteRedeemResult =
  | { ok: true; householdId: string }
  | { ok: false; reason: "not_found" | "expired" | "already_used" | "already_member" };

export async function redeemInvite({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<InviteRedeemResult> {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.householdInvite.findUnique({
      where: { token },
      select: { id: true, householdId: true, status: true, expiresAt: true },
    });

    if (!invite) return { ok: false, reason: "not_found" };
    if (invite.status !== "PENDING") return { ok: false, reason: "already_used" };
    if (invite.expiresAt < new Date()) return { ok: false, reason: "expired" };

    const household = await tx.household.findUnique({
      select: { deletedAt: true },
      where: { id: invite.householdId },
    });

    if (!household || household.deletedAt) return { ok: false, reason: "not_found" };

    const existingMembership = await tx.householdMember.findFirst({
      select: { id: true },
      where: { userId, household: { deletedAt: null } },
    });

    if (existingMembership) return { ok: false, reason: "already_member" };

    await tx.householdMember.create({
      data: { userId, householdId: invite.householdId, role: "MEMBER" },
    });

    await tx.householdInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return { ok: true, householdId: invite.householdId };
  });
}
