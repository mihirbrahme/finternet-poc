import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: "http://127.0.0.1:4300",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command:
      "node node_modules/tsx/dist/cli.mjs services/sponsorship-demo/server.ts",
    url: "http://127.0.0.1:4300/api/health",
    timeout: 120000,
    reuseExistingServer: false,
  },
  reporter: "list",
});
