import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/db";
import { MS_PER_DAY } from "@/lib/time-constants";

const INVITE_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export async function createInvite({
  householdId,
  invitedById,
  email,
  householdMemberId,
}: {
  householdId: string;
  invitedById: string;
  email: string;
  householdMemberId?: string | null;
}) {
  const normalizedEmail = email.toLowerCase().trim();

  // Revoke any existing pending invite for this email+household to prevent duplicate valid links
  await prisma.householdInvite.updateMany({
    where: { householdId, email: normalizedEmail, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  if (householdMemberId) {
    await prisma.householdInvite.updateMany({
      where: { householdId, householdMemberId, status: "PENDING" },
      data: { status: "REVOKED" },
    });
  }

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * MS_PER_DAY);
  const token = generateToken();
  const tokenHash = hashInviteToken(token);

  const invite = await prisma.householdInvite.create({
    data: {
      email: normalizedEmail,
      expiresAt,
      householdId,
      householdMemberId: householdMemberId ?? null,
      invitedById,
      tokenHash,
    },
    select: { id: true, email: true, expiresAt: true },
  });

  return { ...invite, token };
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
  const tokenHash = hashInviteToken(token);
  return prisma.householdInvite.findUnique({
    where: { tokenHash },
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
  | { ok: false; reason: "not_found" | "expired" | "already_used" | "already_member" | "email_mismatch" };

export async function redeemInvite({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<InviteRedeemResult> {
  const tokenHash = hashInviteToken(token);

  return prisma.$transaction(async (tx) => {
    const invite = await tx.householdInvite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        householdId: true,
        householdMemberId: true,
        status: true,
        expiresAt: true,
        email: true,
      },
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
      where: { accountId: userId, household: { deletedAt: null } },
    });

    if (existingMembership) return { ok: false, reason: "already_member" };

    const account = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!account?.email || account.email.toLowerCase() !== invite.email) {
      return { ok: false, reason: "email_mismatch" };
    }

    if (invite.householdMemberId) {
      const existingMember = await tx.householdMember.findFirst({
        where: {
          accountId: null,
          householdId: invite.householdId,
          id: invite.householdMemberId,
        },
        select: { id: true },
      });

      if (!existingMember) {
        return { ok: false, reason: "already_used" };
      }

      await tx.householdMember.update({
        where: { id: existingMember.id },
        data: { accountId: userId },
      });
    } else {
      await tx.householdMember.create({
        data: {
          accountId: userId,
          createdByUserId: userId,
          householdId: invite.householdId,
          name: account?.name ?? account?.email ?? invite.email,
          role: "MEMBER",
        },
      });
    }

    await tx.householdInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return { ok: true, householdId: invite.householdId };
  });
}
