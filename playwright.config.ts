import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: "./playwright/global-setup.ts",
  outputDir: "playwright-results",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
    storageState: "playwright/.auth/qa-session.json",
  },
});
