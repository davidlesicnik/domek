import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile(".env");
}

import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

async function main() {
  const email = readArg("--email")?.trim().toLowerCase();
  const password = readArg("--password");

  if (!email || !password) {
    throw new Error("Usage: tsx scripts/auth-set-password.ts --email user@example.com --password 'new-password'");
  }

  const user = await prisma.user.findUnique({
    select: { id: true },
    where: { email },
  });

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  await prisma.passwordCredential.upsert({
    create: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
      userId: user.id,
    },
    update: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
    },
    where: { userId: user.id },
  });

  console.log(`Password updated for ${email}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
