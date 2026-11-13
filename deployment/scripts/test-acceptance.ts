/**
 * Vartul acceptance (M8): contract tests (unit, lifecycle, fuzz and invariants), then the service suites
 * (domain, API, Beckn sandbox, seeded scenes and network invariants, assistants), then the testnet
 * deployment simulation. Browser acceptance runs separately: pnpm test:demo.
 */
import { spawnSync } from "node:child_process";

const steps: [string, string, string[]][] = [
  ["Contracts", "forge", ["test", "--root", "contracts", "-vv"]],
  ...["domain-smoke", "api", "beckn", "scenes", "assistant"].map((t): [string, string, string[]] => [`Service: ${t}`, process.execPath, ["node_modules/tsx/dist/cli.mjs", `tests/vartul/${t}.test.ts`]]),
  ["Testnet deployment simulation", process.execPath, ["node_modules/tsx/dist/cli.mjs", "deployment/scripts/testnet.ts", "simulate"]],
];
for (const [label, cmd, args] of steps) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, VARTUL_AI_DISABLE: "1" } });
  if (r.status !== 0) {
    console.error(`${label} failed`);
    process.exit(r.status ?? 1);
  }
}
console.log("\nVartul acceptance passed. Run pnpm test:demo for browser acceptance.");
