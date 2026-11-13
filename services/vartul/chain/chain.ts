import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import {
  Contract,
  ContractFactory,
  Interface,
  JsonRpcProvider,
  Wallet,
  type InterfaceAbi,
  type Log,
} from "ethers";
import { DomainError } from "../lib/util.js";

export const contractNames = [
  "VartulRegistry",
  "VartulAttestations",
  "SandboxINR",
  "RecoveryLotRegistry",
  "ProgrammeEscrow",
  "PayoutRouter",
  "VartulClaims",
  "MaterialSettlement",
] as const;
export type ContractName = (typeof contractNames)[number];
export type Addresses = Record<ContractName, string>;

const root = resolve(import.meta.dirname, "../../..");

function artifact(name: ContractName): { abi: InterfaceAbi; bytecode: string } {
  const file = resolve(root, "contracts/out", `${name}.sol`, `${name}.json`);
  if (!existsSync(file)) throw new Error(`Missing artifact ${file}; run forge build --root contracts`);
  const json = JSON.parse(readFileSync(file, "utf8"));
  return { abi: json.abi, bytecode: json.bytecode.object };
}

export function buildContracts() {
  let result = spawnSync("forge", ["build", "--root", resolve(root, "contracts"), "--offline"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  if (result.status !== 0)
    result = spawnSync("forge", ["build", "--root", resolve(root, "contracts")], { encoding: "utf8", timeout: 180_000 });
  if (result.status !== 0) throw new Error(`forge build failed: ${result.stderr || result.stdout || result.error}`);
}

export interface LogLike {
  address: string;
  topics: readonly string[];
  data: string;
  index: number;
  transactionHash: string;
  blockNumber: number;
}

interface RawReceipt {
  status: string;
  blockNumber: string;
  gasUsed: string;
  contractAddress: string | null;
  logs: { address: string; topics: string[]; data: string; logIndex: string; transactionHash: string; blockNumber: string }[];
}

export interface SentTx {
  hash: string;
  blockNumber: number;
  timestamp: number;
  gasUsed: bigint;
  receipt: { status: number; blockNumber: number; gasUsed: bigint; contractAddress: string | null; logs: LogLike[] };
  logs: LogLike[];
}

const liveNodes = new Set<ChildProcess>();
process.once("exit", () => {
  for (const node of liveNodes) node.kill();
});

/** Owns an isolated local EVM chain (Anvil) and the deployed Vartul contracts. */
export class Chain {
  readonly provider: JsonRpcProvider;
  private proc?: ChildProcess;
  readonly interfaces = {} as Record<ContractName, Interface>;
  addresses?: Addresses;
  private nonces = new Map<string, number>();
  /** Skip gas estimation (used by the seeder for speed); reverts are then diagnosed after the fact. */
  fast = false;
  private pinnedTimestamp?: number;
  private errorInterfaces: Interface[] = [];

  constructor(readonly port: number) {
    this.provider = new JsonRpcProvider(`http://127.0.0.1:${port}`, 31337, {
      staticNetwork: true,
      cacheTimeout: -1,
      batchMaxCount: 100,
      batchStallTime: 0,
    });
    this.provider.pollingInterval = 50;
    for (const name of contractNames) this.interfaces[name] = new Interface(artifact(name).abi);
    this.errorInterfaces = Object.values(this.interfaces);
  }

  async start(genesisTimestamp?: number, stateFile?: string) {
    try {
      await fetch(`http://127.0.0.1:${this.port}`, { signal: AbortSignal.timeout(400) });
      throw new DomainError(`Port ${this.port} is already in use; stop the other process first.`, 500);
    } catch (error) {
      if (error instanceof DomainError) throw error;
    }
    const args = [
      "--host", "127.0.0.1", "--port", String(this.port), "--chain-id", "31337", "--silent",
      "--block-base-fee-per-gas", "0", "--gas-limit", "60000000", "--code-size-limit", "49152",
    ];
    if (genesisTimestamp) args.push("--timestamp", String(genesisTimestamp));
    if (stateFile) args.push("--load-state", stateFile);
    this.proc = spawn("anvil", args, { stdio: "ignore", windowsHide: true });
    const child = this.proc;
    // Never leave an orphaned node holding the port when this process exits (one shared hook, not one per restart).
    liveNodes.add(child);
    child.once("exit", () => liveNodes.delete(child));
    let failure: Error | undefined;
    this.proc.on("error", (e) => (failure = e));
    for (let i = 0; i < 100; i++) {
      if (failure) throw failure;
      try {
        await this.rpc("eth_chainId", []);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error("Anvil did not start");
  }

  async stop() {
    const proc = this.proc;
    if (!proc) return;
    this.proc = undefined;
    const exited = new Promise((r) => proc.once("exit", r));
    proc.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
  }

  private rpcId = 0;

  /** Direct JSON-RPC over keep-alive HTTP (ethers' provider adds ~15 ms per call). */
  async rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(`http://127.0.0.1:${this.port}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++this.rpcId, method, params }),
    });
    const json = (await response.json()) as { result?: T; error?: { code: number; message: string; data?: string } };
    if (json.error) {
      const error = new Error(json.error.message) as Error & { data?: string };
      error.data = typeof json.error.data === "string" ? json.error.data : undefined;
      throw error;
    }
    return json.result as T;
  }

  contract(name: ContractName, runner?: Wallet) {
    if (!this.addresses) throw new Error("contracts not deployed");
    return new Contract(this.addresses[name], this.interfaces[name], runner ?? this.provider);
  }

  async deploy(deployer: Wallet, constructorArgs: (a: Partial<Addresses>) => Record<ContractName, unknown[]>) {
    const addresses: Partial<Addresses> = {};
    for (const name of contractNames) {
      const { abi, bytecode } = artifact(name);
      const args = constructorArgs(addresses)[name];
      const factory = new ContractFactory(abi, bytecode);
      const tx = await factory.getDeployTransaction(...args);
      const sent = await this.sendRaw(deployer, { data: tx.data });
      addresses[name] = sent.receipt.contractAddress!;
    }
    this.addresses = addresses as Addresses;
    return this.addresses;
  }

  attach(addresses: Addresses) {
    this.addresses = addresses;
  }

  /** Send a contract call as `wallet`. Reverts are decoded into readable domain errors. */
  async send(wallet: Wallet, name: ContractName, method: string, args: unknown[]): Promise<SentTx> {
    const data = this.interfaces[name].encodeFunctionData(method, args);
    return this.sendRaw(wallet, { to: this.addresses![name], data }, `${name}.${method}`);
  }

  async sendRaw(wallet: Wallet, tx: { to?: string; data: string }, label = "deploy"): Promise<SentTx> {
    const from = wallet.address;
    const request = { from, to: tx.to, data: tx.data };
    let gas = 6_000_000n;
    if (!this.fast) {
      try {
        gas = (BigInt(await this.rpc<string>("eth_estimateGas", [request])) * 12n) / 10n + 20_000n;
      } catch (error) {
        throw new DomainError(`${label} rejected: ${this.decodeRevert(error)}`, 409, "LEDGER_REVERT");
      }
    }
    let nonce = this.nonces.get(from);
    if (nonce === undefined) nonce = Number(await this.rpc<string>("eth_getTransactionCount", [from, "pending"]));
    const signed = await wallet.signTransaction({
      to: tx.to,
      data: tx.data,
      nonce,
      gasLimit: gas,
      gasPrice: 0n,
      chainId: 31337n,
      type: 0,
    });
    this.nonces.set(from, nonce + 1);
    let hash: string;
    try {
      hash = await this.rpc<string>("eth_sendRawTransaction", [signed]);
    } catch (error) {
      this.nonces.delete(from);
      throw new DomainError(`${label} failed: ${this.decodeRevert(error)}`, 409, "LEDGER_REVERT");
    }
    let raw: RawReceipt | null = null;
    // Anvil mines within a millisecond or two. Poll back-to-back first: on Windows any timer
    // sleep rounds up to ~15.6 ms, which would dominate the cost of every transaction.
    for (let i = 0; i < 400 && !raw; i++) {
      raw = await this.rpc<RawReceipt | null>("eth_getTransactionReceipt", [hash]);
      if (!raw && i >= 50) await new Promise((r) => setTimeout(r, 5));
    }
    if (!raw) throw new Error(`no receipt for ${hash}`);
    const receipt = {
      status: Number(raw.status),
      blockNumber: Number(raw.blockNumber),
      gasUsed: BigInt(raw.gasUsed),
      contractAddress: raw.contractAddress,
      logs: raw.logs.map((l) => ({ address: l.address, topics: l.topics, data: l.data, index: Number(l.logIndex), transactionHash: l.transactionHash, blockNumber: Number(l.blockNumber) })),
    };
    if (receipt.status !== 1) {
      let reason = "reverted on-chain";
      try {
        await this.rpc("eth_call", [request, receipt.blockNumber > 0 ? `0x${(receipt.blockNumber - 1).toString(16)}` : "latest"]);
      } catch (error) {
        reason = this.decodeRevert(error);
      }
      throw new DomainError(`${label} rejected: ${reason}`, 409, "LEDGER_REVERT");
    }
    let timestamp = this.pinnedTimestamp;
    this.pinnedTimestamp = undefined;
    if (timestamp === undefined) {
      const block = await this.rpc<{ timestamp: string }>("eth_getBlockByNumber", [`0x${receipt.blockNumber.toString(16)}`, false]);
      timestamp = Number(block.timestamp);
    }
    this.lastTimestamp = timestamp;
    return {
      hash,
      blockNumber: receipt.blockNumber,
      timestamp,
      gasUsed: receipt.gasUsed,
      receipt,
      logs: [...receipt.logs],
    };
  }

  decodeRevert(error: unknown): string {
    const e = error as { data?: string; info?: { error?: { data?: string; message?: string } }; error?: { data?: string }; shortMessage?: string; message?: string };
    const data = e?.info?.error?.data ?? e?.error?.data ?? e?.data;
    if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
      for (const iface of this.errorInterfaces) {
        try {
          const parsed = iface.parseError(data);
          if (parsed) return parsed.args.length ? `${parsed.name}(${parsed.args.map(String).join(", ")})` : parsed.name;
        } catch {
          /* try next */
        }
      }
      return `revert ${data.slice(0, 10)}`;
    }
    return e?.info?.error?.message ?? e?.shortMessage ?? e?.message ?? String(error);
  }

  async latestTimestamp() {
    const block = await this.rpc<{ timestamp: string }>("eth_getBlockByNumber", ["latest", false]);
    return Number(block.timestamp);
  }

  async blockNumber() {
    return Number(await this.rpc<string>("eth_blockNumber", []));
  }

  /** Pin the next block's timestamp (used by the deterministic seeder). */
  async setNextTimestamp(unix: number) {
    const latest = this.lastTimestamp ?? (await this.latestTimestamp());
    const next = Math.max(unix, latest + 1);
    await this.rpc("evm_setNextBlockTimestamp", [next]);
    this.pinnedTimestamp = next;
  }

  private lastTimestamp?: number;

  /** Move the sandbox clock; time then flows forward from here. */
  async setTime(unix: number) {
    this.lastTimestamp = undefined;
    await this.rpc("evm_setTime", [unix]);
    await this.rpc("evm_mine", []);
  }

  async increaseTime(seconds: number) {
    this.lastTimestamp = undefined;
    await this.rpc("evm_increaseTime", [seconds]);
    await this.rpc("evm_mine", []);
  }

  async dumpState(): Promise<string> {
    return this.rpc<string>("anvil_dumpState", []);
  }

  /**
   * Restore a dumped state. Small states load over RPC; a full demonstration history is larger
   * than Anvil accepts in one request, so the node restarts from a decompressed state file.
   */
  async loadState(hex: string) {
    this.nonces.clear();
    this.lastTimestamp = undefined;
    if (hex.length < 2_000_000) {
      await this.rpc("anvil_reset", []);
      await this.rpc("anvil_loadState", [hex]);
      return;
    }
    const file = resolve(tmpdir(), `vartul-anvil-${this.port}.json`);
    writeFileSync(file, gunzipSync(Buffer.from(hex.slice(2), "hex")));
    await this.stop();
    await this.start(undefined, file);
  }

  async getLogs(fromBlock: number, toBlock: number) {
    if (!this.addresses) return [];
    return this.provider.getLogs({ fromBlock, toBlock, address: Object.values(this.addresses) });
  }

  /** Decode a log against whichever Vartul contract emitted it. */
  decodeLog(log: LogLike | Log) {
    if (!this.addresses) return null;
    const entry = (Object.entries(this.addresses) as [ContractName, string][]).find(
      ([, a]) => a.toLowerCase() === log.address.toLowerCase(),
    );
    if (!entry) return null;
    try {
      const parsed = this.interfaces[entry[0]].parseLog({ topics: [...log.topics], data: log.data });
      if (!parsed) return null;
      const args: Record<string, unknown> = {};
      parsed.fragment.inputs.forEach((input, i) => (args[input.name || String(i)] = parsed.args[i]));
      return { contract: entry[0], event: parsed.name, args };
    } catch {
      return null;
    }
  }
}
