import { defineConfig } from "@playwright/test";

export default defineConfig({
  outputDir: "playwright-results",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    headless: true,
    screenshot: "only-on-failure",
  },
});
