import { createHash, createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { keccak256, toUtf8Bytes, getBytes } from "ethers";

/**
 * Beckn message authentication: an Ed25519 signature over a signing string that binds the
 * creation time, expiry and BLAKE2b-512 digest of the exact request body.
 */
export interface SubscriberKey {
  privateKey: KeyObject;
  publicKey: KeyObject;
  publicKeyB64: string;
}

export function subscriberKey(subscriberId: string): SubscriberKey {
  const seed = getBytes(keccak256(toUtf8Bytes(`vartul-sandbox-beckn:${subscriberId}`)));
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(seed)]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const publicKey = createPublicKey(privateKey);
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return { privateKey, publicKey, publicKeyB64: raw.toString("base64") };
}

export const blakeDigest = (body: string) => `BLAKE-512=${createHash("blake2b512").update(body).digest("base64")}`;

const signingString = (created: number, expires: number, digest: string) =>
  `(created): ${created}\n(expires): ${expires}\ndigest: ${digest}`;

export function authorizationHeader(subscriberId: string, uniqueKeyId: string, key: SubscriberKey, body: string, created: number, ttl = 300) {
  const expires = created + ttl;
  const digest = blakeDigest(body);
  const signature = sign(null, Buffer.from(signingString(created, expires, digest)), key.privateKey).toString("base64");
  return {
    header: `Signature keyId="${subscriberId}|${uniqueKeyId}|ed25519",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`,
    digest,
  };
}

export function parseAuthorization(header: string | undefined) {
  if (!header?.startsWith("Signature ")) return null;
  const fields: Record<string, string> = {};
  for (const m of header.slice(10).matchAll(/(\w+)="([^"]*)"/g)) fields[m[1]] = m[2];
  const [subscriberId, uniqueKeyId, algorithm] = (fields.keyId ?? "").split("|");
  if (!subscriberId || algorithm !== "ed25519") return null;
  return { subscriberId, uniqueKeyId, created: Number(fields.created), expires: Number(fields.expires), signature: fields.signature };
}

/** Verify a signed request against a public key looked up in the registry. */
export function verifyAuthorization(header: string | undefined, body: string, publicKeyB64: string, now: number) {
  const parsed = parseAuthorization(header);
  if (!parsed) return { ok: false, reason: "Missing or malformed Authorization header" };
  if (!(parsed.created <= now + 60 && parsed.expires >= now)) return { ok: false, reason: "Signature expired or not yet valid" };
  const publicKey = createPublicKey({
    key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(publicKeyB64, "base64")]),
    format: "der",
    type: "spki",
  });
  const ok = verify(null, Buffer.from(signingString(parsed.created, parsed.expires, blakeDigest(body))), publicKey, Buffer.from(parsed.signature, "base64"));
  return ok ? { ok: true, subscriberId: parsed.subscriberId } : { ok: false, reason: "Signature does not match body digest" };
}
