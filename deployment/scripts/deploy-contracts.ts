#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type DeployMode = "dry-run" | "live";

interface ContractPlan {
  name: string;
  source: string;
  constructorArgs: (deployed: Record<string, DeploymentResult>) => string[];
}

interface DeploymentResult {
  name: string;
  source: string;
  address: string | null;
  deployTxHash: string | null;
  blockNumber: number | null;
  constructorArgs: string[];
  deploymentStatus: "DRY_RUN_READY" | "DEPLOYED";
}

const CONTRACTS: ContractPlan[] = [
  {
    name: "ParticipantRegistry",
    source: "src/ParticipantRegistry.sol:ParticipantRegistry",
    constructorArgs: () => []
  },
  {
    name: "CredentialRegistry",
    source: "src/CredentialRegistry.sol:CredentialRegistry",
    constructorArgs: (deployed) => [requireAddress(deployed, "ParticipantRegistry")]
  },
  {
    name: "RecoveryAsset",
    source: "src/RecoveryAsset.sol:RecoveryAsset",
    constructorArgs: (deployed) => [requireAddress(deployed, "CredentialRegistry")]
  },
  {
    name: "DemoINR",
    source: "src/DemoINR.sol:DemoINR",
    constructorArgs: (deployed) => [requireAddress(deployed, "CredentialRegistry")]
  },
  {
    name: "AttestationRegistry",
    source: "src/AttestationRegistry.sol:AttestationRegistry",
    constructorArgs: (deployed) => [requireAddress(deployed, "CredentialRegistry")]
  },
  {
    name: "ClaimRegistry",
    source: "src/ClaimRegistry.sol:ClaimRegistry",
    constructorArgs: (deployed) => [requireAddress(deployed, "AttestationRegistry")]
  },
  {
    name: "SettlementEngine",
    source: "src/SettlementEngine.sol:SettlementEngine",
    constructorArgs: (deployed) => [requireAddress(deployed, "DemoINR"), requireAddress(deployed, "RecoveryAsset")]
  }
];

const mode = readMode();
const outputFlagIndex = process.argv.findIndex((argument) => argument === "--output");
const writeDefault = process.argv.includes("--write");
const outputPath =
  outputFlagIndex >= 0
    ? resolve(process.cwd(), process.argv[outputFlagIndex + 1] ?? "deployment/deploy-contracts.demo.json")
    : writeDefault
      ? resolve(process.cwd(), "deployment/deploy-contracts.demo.json")
      : undefined;

if (process.argv.includes("--help")) {
  process.stdout.write(`Usage: npx pnpm@10.16.1 deploy:demo [-- --mode dry-run|live] [--write] [--output path]\n\n`);
  process.stdout.write(`Default mode is dry-run. Live mode requires DEMO_RPC_URL and DEMO_DEPLOYER_PRIVATE_KEY.\n`);
  process.exit(0);
}

const manifest = mode === "live" ? deployLive() : buildDryRunManifest();
const json = `${JSON.stringify(manifest, null, 2)}\n`;

if (outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json, "utf8");
}

process.stdout.write(json);

function readMode(): DeployMode {
  const modeFlagIndex = process.argv.findIndex((argument) => argument === "--mode");
  const raw = modeFlagIndex >= 0 ? process.argv[modeFlagIndex + 1] : process.env.DEMO_DEPLOY_MODE;
  if (raw === undefined || raw === "" || raw === "dry-run") return "dry-run";
  if (raw === "live") return "live";
  throw new Error(`Unsupported deployment mode "${raw}". Use "dry-run" or "live".`);
}

function buildDryRunManifest() {
  const deployed: Record<string, DeploymentResult> = {};
  for (const contract of CONTRACTS) {
    const constructorArgs = contract.constructorArgs(deployed);
    deployed[contract.name] = {
      name: contract.name,
      source: contract.source,
      address: null,
      deployTxHash: null,
      blockNumber: null,
      constructorArgs,
      deploymentStatus: "DRY_RUN_READY"
    };
  }

  return buildManifest({
    mode: "dry-run",
    dependencyMode: "NOT_CONNECTED",
    deploymentStatus: "DRY_RUN_READY",
    chainId: readOptionalNumber(process.env.DEMO_CHAIN_ID),
    deployerAddress: process.env.DEMO_DEPLOYER_ADDRESS ?? null,
    contracts: deployed
  });
}

function deployLive() {
  const rpcUrl = process.env.DEMO_RPC_URL;
  const privateKey = process.env.DEMO_DEPLOYER_PRIVATE_KEY;
  if (!rpcUrl || !privateKey) {
    throw new Error("Live demo deployment requires DEMO_RPC_URL and DEMO_DEPLOYER_PRIVATE_KEY. Dry-run is the safe default.");
  }

  runChecked("forge", ["build"], { cwd: resolve(process.cwd(), "contracts") });
  const chainId = readLiveChainId(rpcUrl);
  const deployerAddress = readDeployerAddress(privateKey);

  const deployed: Record<string, DeploymentResult> = {};
  for (const contract of CONTRACTS) {
    const constructorArgs = contract.constructorArgs(deployed);
    const output = runChecked(
      "forge",
      [
        "create",
        "--json",
        "--rpc-url",
        rpcUrl,
        "--private-key",
        privateKey,
        contract.source,
        ...(constructorArgs.length > 0 ? ["--constructor-args", ...constructorArgs] : [])
      ],
      { cwd: resolve(process.cwd(), "contracts") }
    );
    const forgeResult = parseJsonObject(output.stdout);
    const deployTxHash = readString(forgeResult.transactionHash, "transactionHash");
    deployed[contract.name] = {
      name: contract.name,
      source: contract.source,
      address: readString(forgeResult.deployedTo, "deployedTo"),
      deployTxHash,
      blockNumber: readTransactionBlockNumber(rpcUrl, deployTxHash),
      constructorArgs,
      deploymentStatus: "DEPLOYED"
    };
  }

  return buildManifest({
    mode: "live",
    dependencyMode: "TESTNET_REAL",
    deploymentStatus: "DEPLOYED",
    chainId,
    deployerAddress,
    contracts: deployed
  });
}

function buildManifest(input: {
  mode: DeployMode;
  dependencyMode: "NOT_CONNECTED" | "TESTNET_REAL";
  deploymentStatus: "DRY_RUN_READY" | "DEPLOYED";
  chainId: number | null;
  deployerAddress: string | null;
  contracts: Record<string, DeploymentResult>;
}) {
  return {
    environment: "demo",
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    dependencyMode: input.dependencyMode,
    deploymentStatus: input.deploymentStatus,
    requiredEnv: ["DEMO_RPC_URL", "DEMO_DEPLOYER_PRIVATE_KEY"],
    optionalEnv: ["DEMO_CHAIN_NAME", "DEMO_CHAIN_ID", "DEMO_DEPLOYER_ADDRESS"],
    chain: {
      name: process.env.DEMO_CHAIN_NAME ?? "public-demo-testnet",
      chainId: input.chainId,
      rpcUrlEnv: "DEMO_RPC_URL"
    },
    deployer: {
      address: input.deployerAddress,
      privateKeyEnv: "DEMO_DEPLOYER_PRIVATE_KEY"
    },
    deploymentOrder: CONTRACTS.map((contract) => contract.name),
    contracts: input.contracts,
    notes: [
      "Dry-run mode is the default and does not submit transactions.",
      "Live mode deploys with forge create in dependency order and records addresses only after chain submission.",
      "dINR is sandbox programmable settlement value only.",
      "OBP_READY_RECOVERY_CLAIM remains evidence-backed and quantity-bounded with isOfficialCredit=false."
    ]
  };
}

function requireAddress(deployed: Record<string, DeploymentResult>, name: string): string {
  return deployed[name]?.address ?? `<${name}.address>`;
}

function readLiveChainId(rpcUrl: string): number {
  const output = runChecked("cast", ["chain-id", "--rpc-url", rpcUrl]);
  const chainId = Number.parseInt(output.stdout.trim(), 10);
  if (!Number.isFinite(chainId)) throw new Error(`Unable to parse chain id from cast output: ${output.stdout}`);
  return chainId;
}

function readDeployerAddress(privateKey: string): string {
  const output = runChecked("cast", ["wallet", "address", "--private-key", privateKey]);
  return output.stdout.trim();
}

function readTransactionBlockNumber(rpcUrl: string, txHash: string): number | null {
  const output = runChecked("cast", ["tx", "--json", txHash, "--rpc-url", rpcUrl]);
  const tx = parseJsonObject(output.stdout);
  const value = tx.blockNumber;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.startsWith("0x")) return Number.parseInt(value, 16);
  if (typeof value === "string") return Number.parseInt(value, 10);
  return null;
}

function readOptionalNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readString(value: unknown, key: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`forge create JSON did not include ${key}`);
  }
  return value;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error(`Expected JSON object in command output: ${raw}`);
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

function runChecked(
  command: string,
  args: string[],
  options?: { cwd?: string }
): { stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: options?.cwd,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.filter((arg) => arg !== process.env.DEMO_DEPLOYER_PRIVATE_KEY).join(" ")} failed\n${result.stderr}`);
  }
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}
