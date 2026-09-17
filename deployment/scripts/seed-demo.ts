#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildAamhiDemoState, buildDemoStateSummary } from "./demo-state.js";

type SeedMode = "local-services" | "live-api";

const mode = readSeedMode();
const outputFlagIndex = process.argv.findIndex((argument) => argument === "--output");
const writeDefault = process.argv.includes("--write");
const outputPath =
  outputFlagIndex >= 0
    ? resolve(process.cwd(), process.argv[outputFlagIndex + 1] ?? "deployment/demo-seed.summary.json")
    : writeDefault
      ? resolve(process.cwd(), "deployment/demo-seed.summary.json")
      : undefined;

if (process.argv.includes("--help")) {
  process.stdout.write(`Usage: npx pnpm@10.16.1 seed:demo [-- --mode local-services|live-api] [--write] [--output path]\n\n`);
  process.stdout.write(`Default mode is local-services. live-api mode requires DEMO_API_BASE_URL and service adapters.\n`);
  process.exit(0);
}

const summary = mode === "live-api" ? seedLiveApi() : seedLocalServices();
const json = `${JSON.stringify(summary, null, 2)}\n`;

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json, "utf8");
}

process.stdout.write(json);

function readSeedMode(): SeedMode {
  const modeFlagIndex = process.argv.findIndex((argument) => argument === "--mode");
  const raw = modeFlagIndex >= 0 ? process.argv[modeFlagIndex + 1] : process.env.DEMO_SEED_MODE;
  if (raw === undefined || raw === "" || raw === "local-services") return "local-services";
  if (raw === "live-api") return "live-api";
  throw new Error(`Unsupported seed mode "${raw}". Use "local-services" or "live-api".`);
}

function seedLocalServices() {
  const state = buildAamhiDemoState();
  const summary = buildDemoStateSummary(state);
  return {
    environment: "demo",
    mode: "local-services",
    dependencyMode: "LOCAL_MOCK",
    seededAt: new Date().toISOString(),
    summary,
    liveSwitchRequired: {
      mode: "live-api",
      requiredEnv: ["DEMO_API_BASE_URL"],
      replacementWork:
        "Replace the local service builders with authenticated HTTP clients for participant, credential, asset, evidence, tokenisation, Beckn, settlement, attestation and claim APIs. Do not patch databases directly."
    }
  };
}

function seedLiveApi() {
  if (!process.env.DEMO_API_BASE_URL) {
    throw new Error("live-api seed mode requires DEMO_API_BASE_URL. The default local-services mode is safe and uses supported in-repo services.");
  }
  throw new Error(
    "live-api seed mode is intentionally not wired until demo service endpoints and auth are available. Use local-services now, then replace through API adapters without database patching."
  );
}
