import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import { ParticipantRepository, ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { ParticipantRecord } from "../../services/core-api/src/modules/participants/index.js";

const root = process.cwd();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

const sampleParticipants = readJson<ParticipantRecord[]>("samples/aamhi-demo/participants.json");
const participantService = new ParticipantService(new ParticipantRepository(sampleParticipants));
const credentialService = new CredentialService(participantService);

const aamhi = participantService.getParticipant("ORG-AAMHI-001");
assert.ok(aamhi);
assert.equal(aamhi.did, "did:web:finternet-poc.local:participants:ORG-AAMHI-001");

const trustView = participantService.getTrustView("ORG-AAMHI-001");
assert.equal(trustView.participantId, "ORG-AAMHI-001");
assert.equal(trustView.status, "ACTIVE");
assert.deepEqual(trustView.roles, ["RECOVERY_ORIGINATOR"]);
assert.equal(trustView.activeAccounts.length, 1);

const verifierAccount = "0x7777777777777777777777777777777777777777";
participantService.bindAccount({
  participantId: "ORG-VERIFIER-001",
  chainId: 31337,
  accountAddress: verifierAccount,
  purpose: "ATTESTATION_ACCOUNT"
});

const credential = credentialService.issueCredential({
  credentialId: "VC-VERIFIER-000002",
  participantId: "ORG-VERIFIER-001",
  type: "VerifierCredential",
  roles: ["VERIFIER"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: [verifierAccount],
  validFrom: "2026-10-01T00:00:00Z",
  validUntil: "2027-03-31T23:59:59Z"
});

assert.equal(credential.subjectDid, "did:web:finternet-poc.local:participants:ORG-VERIFIER-001");
assert.equal(credential.proofMode, "DEMO_ISSUER_UNSIGNED");

const validResult = credentialService.verifyCredential({
  credentialId: "VC-VERIFIER-000002",
  requiredRole: "VERIFIER",
  accountAddress: verifierAccount,
  at: "2026-10-15T00:00:00Z"
});
assert.equal(validResult.valid, true);
assert.equal(validResult.reason, "VALID");

const accountMismatch = credentialService.verifyCredential({
  credentialId: "VC-VERIFIER-000002",
  requiredRole: "VERIFIER",
  accountAddress: "0x8888888888888888888888888888888888888888",
  at: "2026-10-15T00:00:00Z"
});
assert.equal(accountMismatch.valid, false);
assert.equal(accountMismatch.reason, "ACCOUNT_NOT_BOUND_TO_CREDENTIAL");

const expiredResult = credentialService.verifyCredential({
  credentialId: "VC-VERIFIER-000002",
  requiredRole: "VERIFIER",
  accountAddress: verifierAccount,
  at: "2027-04-01T00:00:00Z"
});
assert.equal(expiredResult.valid, false);
assert.equal(expiredResult.reason, "CREDENTIAL_EXPIRED");

credentialService.revokeCredential("VC-VERIFIER-000002", "2026-10-20T00:00:00Z");
const revokedResult = credentialService.verifyCredential({
  credentialId: "VC-VERIFIER-000002",
  requiredRole: "VERIFIER",
  accountAddress: verifierAccount,
  at: "2026-10-21T00:00:00Z"
});
assert.equal(revokedResult.valid, false);
assert.equal(revokedResult.reason, "CREDENTIAL_REVOKED");

participantService.createParticipant({
  participantId: "ORG-DEMO-999",
  legalName: "Demo Participant",
  displayName: "Demo Participant",
  organisationType: "BUYER",
  jurisdiction: "IN",
  roles: ["BUYER"],
  createdAt: "2026-10-01T00:00:00Z"
});
assert.equal(
  participantService.createDid("ORG-DEMO-999"),
  "did:web:finternet-poc.local:participants:ORG-DEMO-999"
);

console.log("Identity participant and credential tests passed.");
