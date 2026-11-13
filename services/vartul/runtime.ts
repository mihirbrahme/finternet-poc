import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Chain, buildContracts, contractNames } from "./chain/chain.js";
import { Vartul } from "./domain/vartul.js";
import type { Store } from "./domain/store.js";

export const root = resolve(import.meta.dirname, "../..");
export const snapshotDir = resolve(root, ".vartul/snapshots");

export const config = {
  apiPort: Number(process.env.VARTUL_PORT ?? 4300),
  chainPort: Number(process.env.VARTUL_CHAIN_PORT ?? 18545),
  publicUrl: process.env.VARTUL_PUBLIC_URL ?? `http://127.0.0.1:${process.env.VARTUL_PORT ?? 4300}`,
};

/**
 * Fingerprint of everything a snapshot depends on: contract bytecode, dataset and seeder.
 * A snapshot built from different inputs is stale and must be regenerated.
 */
export function buildFingerprint() {
  const h = createHash("sha256");
  for (const name of contractNames) {
    const file = resolve(root, "contracts/out", `${name}.sol`, `${name}.json`);
    h.update(JSON.parse(readFileSync(file, "utf8")).bytecode.object);
  }
  for (const file of ["services/vartul/dataset/murud.ts", "services/vartul/seed/history.ts", "services/vartul/seed/scenes.ts", "services/vartul/domain/vartul.ts"]) {
    const path = resolve(root, file);
    if (existsSync(path)) h.update(readFileSync(path));
  }
  return h.digest("hex").slice(0, 16);
}

/** Owns the chain process, the Vartul node and named snapshots (one per demonstration scene). */
export class Runtime {
  readonly chain: Chain;
  readonly vartul: Vartul;
  current = "fresh";
  private queue: Promise<unknown> = Promise.resolve();

  constructor(chainPort = config.chainPort, publicUrl = config.publicUrl) {
    this.chain = new Chain(chainPort);
    this.vartul = new Vartul(this.chain, publicUrl);
  }

  async start(genesis?: number) {
    await this.chain.start(genesis);
  }

  async stop() {
    await this.chain.stop();
  }

  /** Serialise all state-changing work: one ledger writer at a time. */
  exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    return next;
  }

  snapshotExists(name: string) {
    return existsSync(resolve(snapshotDir, `${name}.chain.hex`)) && existsSync(resolve(snapshotDir, `${name}.store.json`));
  }

  snapshotsFresh() {
    const meta = resolve(snapshotDir, "meta.json");
    if (!existsSync(meta)) return false;
    try {
      return JSON.parse(readFileSync(meta, "utf8")).fingerprint === buildFingerprint();
    } catch {
      return false;
    }
  }

  markSnapshotsFresh(extra: Record<string, unknown>) {
    writeFileSync(resolve(snapshotDir, "meta.json"), JSON.stringify({ fingerprint: buildFingerprint(), createdAt: new Date().toISOString(), ...extra }, null, 2));
  }

  listSnapshots() {
    if (!existsSync(snapshotDir)) return [];
    return readdirSync(snapshotDir).filter((f) => f.endsWith(".store.json")).map((f) => f.replace(".store.json", ""));
  }

  async saveSnapshot(name: string, sceneTime: number) {
    mkdirSync(snapshotDir, { recursive: true });
    const store = this.vartul.store;
    store.snapshot = name;
    store.sceneTime = sceneTime;
    writeFileSync(resolve(snapshotDir, `${name}.chain.hex`), await this.chain.dumpState());
    writeFileSync(resolve(snapshotDir, `${name}.store.json`), JSON.stringify(store));
  }

  /** Restore an exact ledger and off-ledger state, pin the clock, and rebuild projections from logs. */
  async loadSnapshot(name: string) {
    if (!this.snapshotExists(name)) throw new Error(`Snapshot ${name} not found; run pnpm vartul:seed`);
    const store = JSON.parse(readFileSync(resolve(snapshotDir, `${name}.store.json`), "utf8")) as Store;
    await this.chain.loadState(readFileSync(resolve(snapshotDir, `${name}.chain.hex`), "utf8"));
    this.vartul.store = store;
    this.chain.attach(store.deployment!);
    this.vartul.clock = undefined;
    this.vartul.scene = store.scene;
    await this.chain.setTime(store.sceneTime);
    this.vartul.indexer.reset();
    await this.vartul.sync();
    this.current = name;
  }
}

export function ensureContractsBuilt() {
  buildContracts();
}
