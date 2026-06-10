import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

import { createPasswordResetToken } from "../src/lib/auth/reset-tokens";
import { prisma } from "../src/lib/db";
import { sendPasswordResetEmail } from "../src/lib/email";
import { getAppRuntimeConfig, getOptionalEmailConfig } from "../src/lib/env";

const sendEmails = process.argv.includes("--send-emails");

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      id: true,
      name: true,
      passwordCredential: { select: { userId: true } },
    },
    where: {
      deletedAt: null,
    },
  });

  const candidates = users.filter((user) => user.email && !user.passwordCredential);

  if (candidates.length === 0) {
    console.log("No existing users need migration.");
    return;
  }

  console.log(`Found ${candidates.length} user(s) without local credentials.`);

  if (!sendEmails) {
    for (const user of candidates) {
      console.log(`- ${user.email}`);
    }
    console.log("Run again with --send-emails to send password setup links when SMTP is configured.");
    return;
  }

  if (!getOptionalEmailConfig()) {
    throw new Error("SMTP is not configured. Remove --send-emails or configure SMTP first.");
  }

  const { appUrl } = getAppRuntimeConfig();
  if (!appUrl) {
    throw new Error("APP_URL is required when sending password setup emails.");
  }

  for (const user of candidates) {
    if (!user.email) {
      continue;
    }

    const { token } = await createPasswordResetToken(user.id);
    const resetUrl = new URL("/en-US/reset-password", appUrl);
    resetUrl.searchParams.set("token", token);

    await sendPasswordResetEmail({
      locale: "en-US",
      resetUrl: resetUrl.toString(),
      toEmail: user.email,
    });

    console.log(`Sent password setup email to ${user.email}`);
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
