import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  await prisma.passwordResetToken.create({
    data: {
      expiresAt,
      tokenHash: hashToken(token),
      userId,
    },
  });

  return { expiresAt, token };
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      expiresAt: { gt: now },
      tokenHash,
      usedAt: null,
    },
  });

  if (!resetToken) {
    return null;
  }

  await prisma.passwordResetToken.update({
    data: { usedAt: now },
    where: { id: resetToken.id },
  });

  return resetToken;
}
