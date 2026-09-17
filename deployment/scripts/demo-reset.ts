#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildAamhiDemoState, buildDemoStateSummary } from "./demo-state.js";

const state = buildAamhiDemoState();
const summary = buildDemoStateSummary(state);
const json = `${JSON.stringify(summary, null, 2)}\n`;

const outputFlagIndex = process.argv.findIndex((argument) => argument === "--output");
const writeDefault = process.argv.includes("--write");
const outputPath =
  outputFlagIndex >= 0
    ? resolve(process.cwd(), process.argv[outputFlagIndex + 1] ?? "deployment/demo-state.local.json")
    : writeDefault
      ? resolve(process.cwd(), "deployment/demo-state.local.json")
      : undefined;

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json, "utf8");
}

process.stdout.write(json);
