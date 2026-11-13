import { createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { SignJWT, jwtVerify, decodeProtectedHeader, decodeJwt, exportJWK, type JWK } from "jose";
import QRCode from "qrcode";
import { keccak256, toUtf8Bytes, getBytes } from "ethers";
import type { IssuedCredential, Store } from "../domain/store.js";
import { DomainError, isoOf } from "../lib/util.js";

const STATUS_LIST_BITS = 131_072; // 16 KB minimum, per the Bitstring Status List recommendation
export const DID_HOST = "vartul.sandbox";

export const didFor = (participant: string) => `did:web:${DID_HOST}:issuers:${participant.toLowerCase()}`;

interface IssuerKey {
  did: string;
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
  jwk?: JWK;
}

/** Deterministic Ed25519 issuer keys for the sandbox (derived from public names; never for real use). */
function issuerKey(participant: string): IssuerKey {
  const seed = getBytes(keccak256(toUtf8Bytes(`vartul-sandbox-issuer:${participant}`)));
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(seed)]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const did = didFor(participant);
  return { did, kid: `${did}#key-1`, privateKey, publicKey: createPublicKey(privateKey) };
}

export type CredentialKind =
  | "VartulParticipantCredential"
  | "RecoveryVerificationCredential"
  | "FundedRecoveryCertificate"
  | "MaterialSupplyCertificate"
  | "WorkRecordCredential";

export class CredentialService {
  private keys = new Map<string, IssuerKey>();

  constructor(private store: () => Store, private baseUrl: () => string) {}

  key(participant: string) {
    let k = this.keys.get(participant);
    if (!k) {
      k = issuerKey(participant);
      this.keys.set(participant, k);
    }
    return k;
  }

  async didDocument(participant: string, name: string) {
    const k = this.key(participant);
    k.jwk ??= await exportJWK(k.publicKey);
    return {
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/jwk/v1"],
      id: k.did,
      alsoKnownAs: [name],
      verificationMethod: [{ id: k.kid, type: "JsonWebKey", controller: k.did, publicKeyJwk: { ...k.jwk, kid: k.kid } }],
      assertionMethod: [k.kid],
    };
  }

  statusListUrl() {
    return `${this.baseUrl()}/credentials/status/1`;
  }

  async issue(input: {
    kind: CredentialKind;
    issuer: string;
    issuerName: string;
    subjectId: string;
    subject: Record<string, unknown>;
    issuedAt: number;
    summary: Record<string, unknown>;
    id?: string;
  }): Promise<IssuedCredential> {
    const store = this.store();
    const index = store.statusList.next++;
    const prefix = { VartulParticipantCredential: "PC", RecoveryVerificationCredential: "VR", FundedRecoveryCertificate: "FRC", MaterialSupplyCertificate: "MSC", WorkRecordCredential: "WR" }[input.kind];
    store.counters[prefix] = (store.counters[prefix] ?? 0) + 1;
    const id = input.id ?? `${prefix}-${String(store.counters[prefix]).padStart(5, "0")}`;
    const k = this.key(input.issuer);
    const credential = {
      "@context": ["https://www.w3.org/ns/credentials/v2", `${this.baseUrl()}/contexts/vartul/v1`],
      id: `urn:vartul:credential:${id}`,
      type: ["VerifiableCredential", input.kind],
      issuer: { id: k.did, name: input.issuerName },
      validFrom: isoOf(input.issuedAt),
      credentialSubject: { id: input.subjectId, ...input.subject },
      credentialStatus: {
        id: `${this.statusListUrl()}#${index}`,
        type: "BitstringStatusListEntry",
        statusPurpose: "revocation",
        statusListIndex: String(index),
        statusListCredential: this.statusListUrl(),
      },
    };
    const jwt = await new SignJWT(credential as Record<string, unknown>)
      .setProtectedHeader({ alg: "EdDSA", typ: "vc+jwt", kid: k.kid })
      .setIssuedAt(input.issuedAt)
      .sign(k.privateKey);
    const issued: IssuedCredential = {
      id,
      type: input.kind,
      issuer: input.issuer,
      subject: input.subjectId,
      jwt,
      statusIndex: index,
      issuedAt: input.issuedAt,
      summary: input.summary,
    };
    store.credentials[id] = issued;
    return issued;
  }

  revoke(id: string) {
    const c = this.store().credentials[id];
    if (!c) throw new DomainError(`Unknown credential ${id}`, 404);
    if (!this.store().statusList.revoked.includes(c.statusIndex)) this.store().statusList.revoked.push(c.statusIndex);
  }

  encodedList() {
    const bits = Buffer.alloc(STATUS_LIST_BITS / 8);
    for (const i of this.store().statusList.revoked) bits[i >> 3] |= 0x80 >> (i & 7);
    return gzipSync(bits).toString("base64url");
  }

  async statusListCredential(now: number) {
    const k = this.key("VARTUL-NET");
    const credential = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      id: this.statusListUrl(),
      type: ["VerifiableCredential", "BitstringStatusListCredential"],
      issuer: k.did,
      validFrom: isoOf(now),
      credentialSubject: { id: `${this.statusListUrl()}#list`, type: "BitstringStatusList", statusPurpose: "revocation", encodedList: this.encodedList() },
    };
    return new SignJWT(credential).setProtectedHeader({ alg: "EdDSA", typ: "vc+jwt", kid: k.kid }).setIssuedAt(now).sign(k.privateKey);
  }

  /** Verify a VC-JWT: signature against the issuer DID key, then revocation status. */
  async verify(jwt: string) {
    const header = decodeProtectedHeader(jwt);
    const claims = decodeJwt(jwt) as Record<string, any>;
    const issuerDid: string = claims.issuer?.id ?? claims.issuer;
    const participant = issuerDid?.split(":").pop()?.toUpperCase() ?? "";
    const k = this.key(participant);
    const checks: { check: string; ok: boolean; detail: string }[] = [];
    let signatureOk = false;
    try {
      if (header.kid !== k.kid) throw new Error("key id does not match issuer DID");
      await jwtVerify(jwt, k.publicKey, { algorithms: ["EdDSA"], typ: "vc+jwt" });
      signatureOk = true;
    } catch (e) {
      checks.push({ check: "Signature", ok: false, detail: (e as Error).message });
    }
    if (signatureOk) checks.push({ check: "Signature", ok: true, detail: `Ed25519 signature by ${issuerDid}` });
    const index = Number(claims.credentialStatus?.statusListIndex ?? -1);
    const bits = gunzipSync(Buffer.from(this.encodedList(), "base64url"));
    const revoked = index >= 0 && (bits[index >> 3] & (0x80 >> (index & 7))) !== 0;
    checks.push({
      check: "Revocation status",
      ok: !revoked,
      detail: revoked ? `Revoked in status list (index ${index})` : `Not revoked (status list index ${index})`,
    });
    return { header, credential: claims, signatureOk, revoked, checks };
  }

  async qr(url: string) {
    return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111827", light: "#ffffff" } });
  }
}
