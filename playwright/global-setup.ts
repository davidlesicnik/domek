import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

import { createSupabaseAdminClient } from "../src/lib/supabase";

const QA_STORAGE_STATE_PATH = "playwright/.auth/qa-session.json";

function getRequiredQaTestEmail() {
  const qaTestEmail = process.env.QA_TEST_EMAIL;
  if (!qaTestEmail) {
    throw new Error("QA_TEST_EMAIL is not configured");
  }
  return qaTestEmail;
}

async function waitForSupabaseSessionCookie(getCookies: () => Promise<string[]>) {
  const timeoutMs = 15_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const cookieNames = await getCookies();
    if (cookieNames.some((name) => name.startsWith("sb-") && name.endsWith("-auth-token"))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Timed out waiting for Supabase auth session cookie");
}

export default async function globalSetup() {
  const qaTestEmail = getRequiredQaTestEmail();
  const supabaseAdmin = createSupabaseAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: qaTestEmail,
  });

  if (error) {
    throw new Error(`Failed generating QA magic link: ${error.message}`);
  }

  const magicLink = data.properties?.action_link;
  if (!magicLink) {
    throw new Error("Supabase did not return an action_link for QA magic link generation");
  }

  await mkdir("playwright/.auth", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(magicLink, { waitUntil: "networkidle" });
  await waitForSupabaseSessionCookie(async () => {
    const cookies = await context.cookies();
    return cookies.map((cookie) => cookie.name);
  });
  await context.storageState({ path: QA_STORAGE_STATE_PATH });

  await context.close();
  await browser.close();
}
