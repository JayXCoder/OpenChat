import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:42817",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:42817",
    timeout: 120_000,
    reuseExistingServer: true
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
