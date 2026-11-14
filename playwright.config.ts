import { defineConfig } from "@playwright/test";

const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalURL || "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    colorScheme: "light",
    actionTimeout: 10_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium" },
    {
      name: "mobile-chromium",
      testMatch: /(?:accessibility|layout|guided|shortcuts)\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: externalURL
    ? undefined
    : {
        command: "pnpm build && pnpm preview --port 4173 --strictPort",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: false,
      },
});
