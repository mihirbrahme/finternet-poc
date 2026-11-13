import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  testMatch: "capture.spec.ts",
  workers: 1,
  timeout: 240000,
  use: {
    baseURL: "http://127.0.0.1:4300",
    headless: true,
    viewport: { width: 1600, height: 1100 },
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    command:
      "node node_modules/tsx/dist/cli.mjs services/sponsorship-demo/server.ts",
    url: "http://127.0.0.1:4300/api/health",
    reuseExistingServer: false,
    timeout: 120000,
  },
  reporter: "list",
});
