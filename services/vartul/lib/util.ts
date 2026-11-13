import { createHash } from "node:crypto";
import { AbiCoder, Wallet, getBytes, keccak256, toUtf8Bytes, concat } from "ethers";

/** Deterministic JSON: object keys sorted recursively. Used for every fingerprint. */
export function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export const sha256 = (data: string | Uint8Array) => `0x${createHash("sha256").update(data).digest("hex")}`;
export const fingerprint = (value: unknown) => keccak256(toUtf8Bytes(canonical(value)));
export const idOf = (code: string) => keccak256(toUtf8Bytes(code));
export const textId = (text: string) => keccak256(toUtf8Bytes(text));

/** Sorted-pair keccak Merkle tree (OpenZeppelin MerkleProof compatible). */
export function merkle(leaves: string[]) {
  if (leaves.length === 0) throw new Error("empty Merkle tree");
  const hashLeaf = (l: string) => keccak256(AbiCoder.defaultAbiCoder().encode(["bytes32"], [l]));
  const pair = (a: string, b: string) => (BigInt(a) < BigInt(b) ? keccak256(concat([a, b])) : keccak256(concat([b, a])));
  const layers: string[][] = [leaves.map(hashLeaf)];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) next.push(i + 1 < prev.length ? pair(prev[i], prev[i + 1]) : prev[i]);
    layers.push(next);
  }
  const root = layers[layers.length - 1][0];
  const proof = (index: number) => {
    const path: string[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const sibling = index ^ 1;
      if (sibling < layers[l].length) path.push(layers[l][sibling]);
      index >>= 1;
    }
    return path;
  };
  const verify = (leaf: string, path: string[], expectedRoot: string) =>
    path.reduce((acc, sib) => pair(acc, sib), hashLeaf(leaf)) === expectedRoot;
  return { root, proof, verify };
}

/** Sandbox keys are derived from public names. They protect nothing and must never hold value. */
export const sandboxWallet = (name: string) => new Wallet(keccak256(toUtf8Bytes(`vartul-sandbox-key:${name}`)));

/** Seeded pseudo-random generator (mulberry32) so the history is identical on every machine. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    normal: (mean: number, sd: number) => {
      const u = 1 - next();
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    chance: (p: number) => next() < p,
  };
}

export const toUnix = (iso: string) => Math.floor(Date.parse(iso) / 1000);
export const isoOf = (unix: number) => new Date(unix * 1000).toISOString();
export const rupees = (wei: bigint) => Number(wei / 10n ** 14n) / 10_000;
export const wei = (inr: number) => BigInt(Math.round(inr * 100)) * 10n ** 16n;
export const kg = (grams: bigint | number) => Number(grams) / 1000;
export const bytesOf = getBytes;

export class DomainError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "DOMAIN_ERROR") {
    super(message);
  }
}
