/**
 * Public test-network deployment tooling for the Vartul contracts (product document §19.1, V18).
 *
 *   pnpm testnet plan     [--network base-sepolia]   Offline: artifacts, sizes, order and wiring. No key, no RPC.
 *   pnpm testnet simulate [--network base-sepolia]   Deploys to a local Anvil that uses the public network's chain ID,
 *                                                    checks every contract's wiring, and writes the simulated
 *                                                    public end state to deployment/testnet/<network>.simulated.json.
 *   pnpm testnet deploy    --network base-sepolia --confirm-public
 *                                                    Real deployment. Needs VARTUL_TESTNET_RPC_URL and
 *                                                    VARTUL_DEPLOYER_KEY. Deliberately not run in this project.
 *
 * The same deploy routine runs in all three, so the simulation exercises exactly what a public deployment would.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, ContractFactory, JsonRpcProvider, NonceManager, Wallet, type InterfaceAbi } from "ethers";
import { buildContracts, contractNames, type ContractName } from "../../services/vartul/chain/chain.js";

const root = resolve(import.meta.dirname, "../..");
const networks: Record<string, { name: string; chainId: number; rpcEnv: string; explorer: string; faucetNote: string }> = JSON.parse(readFileSync(resolve(root, "deployment/testnet/networks.json"), "utf8"));

/** Constructor wiring: identical to the local network bootstrap in services/vartul/domain/vartul.ts. */
const wiring = (facilitator: string, issuer: string, a: Partial<Record<ContractName, string>>): Record<ContractName, unknown[]> => ({
  VartulRegistry: [facilitator],
  VartulAttestations: [a.VartulRegistry],
  SandboxINR: [a.VartulRegistry, issuer],
  RecoveryLotRegistry: [a.VartulRegistry, a.VartulAttestations],
  ProgrammeEscrow: [a.VartulRegistry, a.VartulAttestations, a.SandboxINR, a.RecoveryLotRegistry],
  PayoutRouter: [a.SandboxINR, a.RecoveryLotRegistry, a.ProgrammeEscrow],
  VartulClaims: [a.VartulRegistry, a.RecoveryLotRegistry],
  MaterialSettlement: [a.VartulRegistry, a.SandboxINR, a.RecoveryLotRegistry, a.VartulClaims],
});

/** Post-deployment checks: each immutable reference points at the contract deployed for it. */
const checks: [ContractName, string, ContractName][] = [
  ["VartulAttestations", "registry", "VartulRegistry"],
  ["SandboxINR", "registry", "VartulRegistry"],
  ["RecoveryLotRegistry", "registry", "VartulRegistry"],
  ["RecoveryLotRegistry", "attestations", "VartulAttestations"],
  ["ProgrammeEscrow", "registry", "VartulRegistry"],
  ["ProgrammeEscrow", "attestations", "VartulAttestations"],
  ["ProgrammeEscrow", "money", "SandboxINR"],
  ["ProgrammeEscrow", "lots", "RecoveryLotRegistry"],
  ["PayoutRouter", "money", "SandboxINR"],
  ["PayoutRouter", "lots", "RecoveryLotRegistry"],
  ["PayoutRouter", "escrow", "ProgrammeEscrow"],
  ["VartulClaims", "registry", "VartulRegistry"],
  ["VartulClaims", "lots", "RecoveryLotRegistry"],
  ["MaterialSettlement", "registry", "VartulRegistry"],
  ["MaterialSettlement", "money", "SandboxINR"],
  ["MaterialSettlement", "lots", "RecoveryLotRegistry"],
  ["MaterialSettlement", "claims", "VartulClaims"],
];

function artifact(name: ContractName): { abi: InterfaceAbi; bytecode: string; deployedBytecode: string } {
  const json = JSON.parse(readFileSync(resolve(root, "contracts/out", `${name}.sol`, `${name}.json`), "utf8"));
  return { abi: json.abi, bytecode: json.bytecode.object, deployedBytecode: json.deployedBytecode.object };
}

const arg = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function deployAll(wallet: Wallet, issuer: string, log: (s: string) => void, overrides: Record<string, bigint> = {}) {
  // Explicit nonce tracking: back-to-back deployments must not reuse a nonce the provider has not yet caught up with.
  const signer = new NonceManager(wallet);
  const addresses: Partial<Record<ContractName, string>> = {};
  const txs: Record<string, string> = {};
  let gas = 0n;
  for (const name of contractNames) {
    const { abi, bytecode } = artifact(name);
    const factory = new ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy(...wiring(wallet.address, issuer, addresses)[name], overrides);
    const receipt = await contract.deploymentTransaction()!.wait();
    addresses[name] = await contract.getAddress();
    txs[name] = receipt!.hash;
    gas += receipt!.gasUsed;
    log(`  ${name.padEnd(20)} ${addresses[name]}  gas ${receipt!.gasUsed}`);
  }
  return { addresses: addresses as Record<ContractName, string>, txs, gas };
}

async function verifyWiring(provider: JsonRpcProvider, addresses: Record<ContractName, string>) {
  const failures: string[] = [];
  for (const name of contractNames) if ((await provider.getCode(addresses[name])) === "0x") failures.push(`${name}: no code at ${addresses[name]}`);
  for (const [name, getter, target] of checks) {
    const c = new Contract(addresses[name], artifact(name).abi, provider);
    const got = String(await c.getFunction(getter)()).toLowerCase();
    if (got !== addresses[target].toLowerCase()) failures.push(`${name}.${getter}() is ${got}, expected ${target} ${addresses[target]}`);
  }
  return failures;
}

function plan(network: string) {
  const net = networks[network];
  console.log(`Deployment plan for ${net.name} (chain ${net.chainId})\n`);
  for (const name of contractNames) {
    const a = artifact(name);
    const size = (a.deployedBytecode.length - 2) / 2;
    const wired = wiring("<facilitator>", "<issuer>", Object.fromEntries(contractNames.map((n) => [n, `<${n}>`])))[name];
    console.log(`  ${name.padEnd(20)} ${String(size).padStart(6)} bytes${size > 24_576 ? "  EXCEEDS EIP-170" : ""}   (${wired.join(", ")})`);
  }
  console.log(`\nPost-deployment wiring checks: ${checks.length}`);
  console.log(`Explorer: ${net.explorer}\n${net.faucetNote}`);
}

async function simulate(network: string) {
  const net = networks[network];
  const port = 18590;
  // The well-known Anvil development key. Never use it on a public network.
  const key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const anvil: ChildProcess = spawn("anvil", ["--port", String(port), "--chain-id", String(net.chainId), "--silent"], { stdio: "ignore" });
  process.once("exit", () => anvil.kill());
  try {
    const provider = new JsonRpcProvider(`http://127.0.0.1:${port}`, net.chainId, { staticNetwork: true });
    for (let i = 0; ; i++) {
      try {
        await provider.getBlockNumber();
        break;
      } catch {
        if (i > 100) throw new Error("Anvil did not start");
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const wallet = new Wallet(key, provider);
    console.log(`Simulating deployment to ${net.name} (chain ${net.chainId}) on a local stand-in chain\n`);
    // Fixed fees keep the simulated manifest reproducible run to run.
    const { addresses, txs, gas } = await deployAll(wallet, wallet.address, console.log, { maxFeePerGas: 3_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n });
    const failures = await verifyWiring(provider, addresses);
    if (failures.length) throw new Error(`Wiring checks failed:\n${failures.join("\n")}`);
    console.log(`\n${checks.length} wiring checks passed; ${gas} gas in total.`);
    const bytecodeHash = createHash("sha256").update(contractNames.map((n) => artifact(n).deployedBytecode).join("")).digest("hex");
    const manifest = {
      simulated: true,
      note: "Simulated public end state. These contracts were deployed to a local chain using this network's chain ID; nothing was broadcast to the public network. Explorer links show where they would appear.",
      network,
      name: net.name,
      chainId: net.chainId,
      explorer: net.explorer,
      deployer: wallet.address,
      bytecodeSha256: bytecodeHash,
      gasUsed: gas.toString(),
      contracts: Object.fromEntries(
        contractNames.map((n) => [n, { address: addresses[n], deployTx: txs[n], explorerUrl: `${net.explorer}/address/${addresses[n]}` }]),
      ),
      wiringChecks: checks.length,
      certificateVerification: "Open: anyone can verify a Vartul certificate at /verify/<id> using the issuer's published DID document and the ledger.",
    };
    const out = resolve(root, `deployment/testnet/${network}.simulated.json`);
    writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`Wrote ${out}`);
  } finally {
    anvil.kill();
  }
}

async function deploy(network: string) {
  const net = networks[network];
  if (!process.argv.includes("--confirm-public")) throw new Error("Refusing to deploy to a public network without --confirm-public.");
  const rpc = process.env[net.rpcEnv];
  const key = process.env.VARTUL_DEPLOYER_KEY;
  if (!rpc || !key) throw new Error(`Set ${net.rpcEnv} and VARTUL_DEPLOYER_KEY.`);
  const provider = new JsonRpcProvider(rpc);
  const chainId = Number((await provider.getNetwork()).chainId);
  if (chainId !== net.chainId) throw new Error(`RPC is chain ${chainId}, expected ${net.chainId} (${net.name}).`);
  const wallet = new Wallet(key, provider);
  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) throw new Error(`Deployer ${wallet.address} has no balance. ${net.faucetNote}`);
  const issuer = process.env.VARTUL_ISSUER_ADDRESS ?? wallet.address;
  console.log(`Deploying to ${net.name} from ${wallet.address}`);
  const { addresses, txs, gas } = await deployAll(wallet, issuer, console.log);
  const failures = await verifyWiring(provider, addresses);
  const manifest = { simulated: false, network, name: net.name, chainId, explorer: net.explorer, deployer: wallet.address, gasUsed: gas.toString(), contracts: Object.fromEntries(contractNames.map((n) => [n, { address: addresses[n], deployTx: txs[n], explorerUrl: `${net.explorer}/address/${addresses[n]}` }])), wiringFailures: failures };
  writeFileSync(resolve(root, `deployment/testnet/${network}.deployed.json`), JSON.stringify(manifest, null, 2) + "\n");
  if (failures.length) throw new Error(`Deployed, but wiring checks failed:\n${failures.join("\n")}`);
  console.log("Deployed and verified.");
}

const command = process.argv[2];
const network = arg("--network") ?? "base-sepolia";
if (!networks[network]) throw new Error(`Unknown network ${network}. Known: ${Object.keys(networks).join(", ")}`);
if (!existsSync(resolve(root, "contracts/out/VartulRegistry.sol/VartulRegistry.json"))) buildContracts();
if (command === "plan") plan(network);
else if (command === "simulate") await simulate(network);
else if (command === "deploy") await deploy(network);
else {
  console.log("Usage: pnpm testnet <plan|simulate|deploy> [--network base-sepolia|polygon-amoy] [--confirm-public]");
  process.exitCode = 1;
}
