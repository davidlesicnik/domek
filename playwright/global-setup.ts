import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db";

const QA_STORAGE_STATE_PATH = "playwright/.auth/qa-session.json";

function getRequiredEnv(name: "QA_TEST_EMAIL" | "QA_TEST_PASSWORD") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

async function ensureQaUser() {
  const email = getRequiredEnv("QA_TEST_EMAIL").toLowerCase();
  const password = getRequiredEnv("QA_TEST_PASSWORD");
  const existingUser = await prisma.user.findUnique({
    select: { id: true, name: true },
    where: { email },
  });
  const userId = existingUser?.id ?? randomUUID();

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email,
        id: userId,
        name: "QA Test User",
      },
    });
  }

  await prisma.passwordCredential.upsert({
    create: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
      userId,
    },
    update: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
    },
    where: { userId },
  });

  const membership = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { accountId: userId, household: { deletedAt: null } },
  });

  if (!membership) {
    const household = await prisma.household.create({
      data: { name: "QA Household" },
      select: { id: true },
    });

    await prisma.householdMember.create({
      data: {
        accountId: userId,
        createdByUserId: userId,
        householdId: household.id,
        name: "QA Test User",
        role: "OWNER",
      },
    });
  }

  return { email, password };
}

export default async function globalSetup() {
  const { email, password } = await ensureQaUser();

  await mkdir("playwright/.auth", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost:3000/en-US/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/en-US\/app/, { timeout: 15_000 });
  await context.storageState({ path: QA_STORAGE_STATE_PATH });

  await context.close();
  await browser.close();
}
