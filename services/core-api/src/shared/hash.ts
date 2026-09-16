import { createHash } from "node:crypto";
import { canonicalJson, type CanonicalJsonValue } from "./canonicalJson.js";

export function sha256Hex(content: Buffer | string): string {
  return `0x${createHash("sha256").update(content).digest("hex")}`;
}

export function sha256CanonicalJson(value: CanonicalJsonValue): string {
  return sha256Hex(canonicalJson(value));
}
