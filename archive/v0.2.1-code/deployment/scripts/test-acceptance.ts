import { spawnSync } from "node:child_process";
const tests = [
  "tests/schema/validate-samples.test.ts", "tests/identity/participant-credential.test.ts",
  "tests/end-to-end/asset-evidence.spec.ts", "tests/end-to-end/tokenisation.spec.ts",
  "tests/end-to-end/beckn-discovery.spec.ts", "tests/end-to-end/settlement.spec.ts", "tests/end-to-end/claims.spec.ts",
  "tests/end-to-end/golden-path.spec.ts", "tests/end-to-end/negative-paths.spec.ts",
  "agents/buyer-agent/tests/policy.test.ts", "agents/buyer-agent/tests/flow.test.ts"
];
for (const test of tests) {
  const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", test], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const forge = spawnSync("forge", ["test", "--root", "contracts", "-vv"], { stdio: "inherit" });
if (forge.status !== 0) process.exit(forge.status ?? 1);
console.log("Domain and contract acceptance passed. Run test:demo separately for API/browser acceptance.");
