import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const record = process.argv.includes("--record");
const startedAt = new Date().toISOString();
const treeResult = spawnSync("git", ["write-tree"], { encoding: "utf8" });
if (record && treeResult.status !== 0) throw new Error("Stage the intended handover source before recording validation");
const tree = treeResult.stdout?.trim();
const commands = [
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  ["node_modules/tsx/dist/cli.mjs", "deployment/scripts/check-docs.ts"],
  ["node_modules/tsx/dist/cli.mjs", "deployment/scripts/test-acceptance.ts"],
  ["node_modules/@playwright/test/cli.js", "test"]
];
const results: { command: string; exitCode: number; output: string }[] = [];
let exitCode = 0;
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`;
  process.stdout.write(output);
  exitCode = result.status ?? 1;
  results.push({ command: `node ${args.join(" ")}`, exitCode, output });
  if (exitCode !== 0) break;
}
if (record) {
  mkdirSync("releases/validation", { recursive: true });
  const metadata = { sourceTree: tree, startedAt, completedAt: new Date().toISOString(), exitCode, node: process.version, platform: process.platform, commands: results.map(({command,exitCode})=>({command,exitCode})) };
  writeFileSync("releases/validation/result.json", JSON.stringify(metadata, null, 2));
  writeFileSync("releases/validation/VALIDATION.md", `# Handover validation record\n\n- Source tree: \`${tree}\`\n- Started: ${startedAt}\n- Completed: ${metadata.completedAt}\n- Result: ${exitCode === 0 ? "PASS" : "FAIL"}\n- Node: ${process.version}\n- Platform: ${process.platform}\n\nThis is author-workstation validation. It does not assert independent stakeholder acceptance, security audit or remote CI success. Expected contract/API rejection messages in the log belong to negative tests.\n\n${results.map(r=>`## ${r.command}\n\nExit code: ${r.exitCode}\n\n\`\`\`text\n${r.output.replace(/\u001b\[[0-9;]*m/g, "")}\n\`\`\`\n`).join("\n")}`);
}
if (exitCode !== 0) process.exit(exitCode);
console.log("Complete local handover acceptance passed.");
