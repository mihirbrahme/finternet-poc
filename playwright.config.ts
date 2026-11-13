import { defineConfig } from "@playwright/test";

/** Browser acceptance for Vartul. The web server builds the app, seeds snapshots if stale, and serves on :4300. */
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:4300",
    headless: true,
    viewport: { width: 1600, height: 1000 },
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js build --config apps/vartul-web/vite.config.ts && node node_modules/tsx/dist/cli.mjs services/vartul/server.ts",
    url: "http://127.0.0.1:4300/api/health",
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: { VARTUL_AI_DISABLE: "1" },
  },
  reporter: "list",
});
