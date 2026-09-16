import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RecoveryAssetService } from "../../services/core-api/src/modules/assets/index.js";
import { AttestationService } from "../../services/core-api/src/modules/attestations/index.js";
import { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import { EvidenceService } from "../../services/core-api/src/modules/evidence/index.js";
import { ParticipantRepository, ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { ParticipantRecord } from "../../services/core-api/src/modules/participants/index.js";
import { SettlementService } from "../../services/core-api/src/modules/settlements/index.js";
import { TokenisationService } from "../../services/core-api/src/modules/tokenisation/index.js";

const root = process.cwd();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

const participants = readJson<ParticipantRecord[]>("samples/aamhi-demo/participants.json");
const participantService = new ParticipantService(new ParticipantRepository(participants));
const credentialService = new CredentialService(participantService);
const evidenceService = new EvidenceService();
const attestationService = new AttestationService(participantService, credentialService);
const assetService = new RecoveryAssetService(participantService, evidenceService, attestationService);
const tokenisationService = new TokenisationService(assetService, credentialService);
const settlementService = new SettlementService(participantService, credentialService, tokenisationService);

const tokeniserAccount = "0x1111111111111111111111111111111111111111";
const sellerAccount = "0x2222222222222222222222222222222222222222";
const buyerAccount = "0x3333333333333333333333333333333333333333";
const verifierAccount = "0x5555555555555555555555555555555555555555";

credentialService.issueCredential({
  credentialId: "VC-NETWORK-ADMIN-000001",
  participantId: "ORG-SUMA-001",
  type: "OrganisationCredential",
  roles: ["NETWORK_ADMIN"],
  ethereumAccounts: [tokeniserAccount],
  validFrom: "2026-10-01T00:00:00Z",
  validUntil: "2027-03-31T23:59:59Z"
});

credentialService.issueCredential({
  credentialId: "VC-ORIGINATOR-000001",
  participantId: "ORG-AAMHI-001",
  type: "RecoveryOriginatorCredential",
  roles: ["RECOVERY_ORIGINATOR"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: [sellerAccount],
  validFrom: "2026-10-01T00:00:00Z",
  validUntil: "2027-03-31T23:59:59Z"
});

credentialService.issueCredential({
  credentialId: "VC-BUYER-000001",
  participantId: "ORG-BUYER-001",
  type: "NetworkParticipantCredential",
  roles: ["BUYER"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: [buyerAccount],
  validFrom: "2026-10-01T00:00:00Z",
  validUntil: "2027-03-31T23:59:59Z"
});

credentialService.issueCredential({
  credentialId: "VC-VERIFIER-000001",
  participantId: "ORG-VERIFIER-001",
  type: "VerifierCredential",
  roles: ["VERIFIER"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: [verifierAccount],
  validFrom: "2026-10-01T00:00:00Z",
  validUntil: "2027-03-31T23:59:59Z"
});

const asset = assetService.createAsset({
  assetId: "RWA-RAI-2026-000001",
  originatorParticipantId: "ORG-AAMHI-001",
  materialCode: "PLASTIC-LDPE",
  estimatedQuantity: 1025,
  verifiedQuantity: 1000,
  villageOrRoute: "Nandgaon coastal route",
  collectionType: "RURAL_SWM",
  obpRiskContext: "COASTAL_COMMUNITY",
  locationReference: "RAI-NANDGAON-COASTAL-ROUTE",
  qualityGrade: "SORTED",
  contaminationPercent: 4.2,
  facilityReference: "AAMHI-RAIGAD-AGGREGATION-01",
  createdAt: "2026-10-01T09:00:00Z"
});

evidenceService.createEvidence({
  evidenceId: "EVD-000001",
  assetId: asset.assetId,
  type: "WEIGHMENT_SLIP",
  content: "weighment slip 1000kg ldpe lot",
  mimeType: "application/pdf",
  storageReference: "s3://private/aamhi-demo/EVD-000001.pdf",
  sourceParticipantId: "ORG-AAMHI-001",
  classification: "RESTRICTED",
  capturedAt: "2026-10-01T10:00:00Z"
});

assetService.attachEvidenceManifest(asset.assetId, {
  manifestId: "EVM-000001",
  createdAt: "2026-10-01T10:15:00Z"
});

const verifiedAsset = assetService.verifyAsset({
  assetId: asset.assetId,
  verifierParticipantId: "ORG-VERIFIER-001",
  verifierAccount,
  credentialId: "VC-VERIFIER-000001",
  eventTime: "2026-10-01T11:00:00Z"
});

const tokenised = tokenisationService.tokeniseAsset({
  assetId: verifiedAsset.assetId,
  tokeniserParticipantId: "ORG-SUMA-001",
  tokeniserAccount,
  tokeniserCredentialId: "VC-NETWORK-ADMIN-000001",
  submittedAt: "2026-10-01T12:00:00Z"
});

assert.throws(
  () =>
    settlementService.createSettlement({
      settlementId: "STL-INSUFFICIENT-ASSET",
      contractId: "CTR-000122",
      assetId: tokenised.token.assetId,
      tokenId: tokenised.token.tokenId,
      sellerParticipantId: "ORG-AAMHI-001",
      buyerParticipantId: "ORG-BUYER-001",
      quantity: 1200,
      unitPrice: 20,
      expiry: "2026-10-20T18:00:00Z",
      submittedAt: "2026-10-01T12:05:00Z"
    }),
  /Seller does not hold enough unlocked asset/
);

settlementService.mintDinr({
  participantId: "ORG-BUYER-001",
  amount: 10_000,
  treasuryParticipantId: "ORG-SUMA-001",
  treasuryCredentialId: "VC-NETWORK-ADMIN-000001",
  treasuryAccount: tokeniserAccount,
  submittedAt: "2026-10-01T12:04:00Z"
});

const settlement = settlementService.createSettlement({
  settlementId: "STL-000001",
  contractId: "CTR-000123",
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  sellerParticipantId: "ORG-AAMHI-001",
  buyerParticipantId: "ORG-BUYER-001",
  quantity: 500,
  unitPrice: 20,
  settlementType: "SIMPLE_DVP",
  expiry: "2026-10-20T18:00:00Z",
  submittedAt: "2026-10-01T12:05:00Z"
});

assert.equal(settlement.state, "CREATED");
assert.equal(settlement.paymentAmount, 10_000);
assert.equal(settlement.dinrLeg.status, "PENDING");
assert.equal(settlement.assetLeg.status, "PENDING");

const funded = settlementService.fundSettlement({
  settlementId: "STL-000001",
  buyerParticipantId: "ORG-BUYER-001",
  buyerAccount,
  submittedAt: "2026-10-01T12:06:00Z"
});

assert.equal(funded.state, "FUNDED");
assert.equal(funded.dinrLeg.status, "LOCKED");
assert.equal(settlementService.getDinrBalance("ORG-BUYER-001").balance, 0);

const locked = settlementService.lockAsset({
  settlementId: "STL-000001",
  sellerParticipantId: "ORG-AAMHI-001",
  sellerAccount,
  submittedAt: "2026-10-01T12:07:00Z"
});

assert.equal(locked.state, "READY");
assert.equal(locked.assetLeg.status, "LOCKED");
assert.equal(tokenised.token.lockedBalances["ORG-AAMHI-001"], 500);

assert.throws(
  () =>
    settlementService.createSettlement({
      settlementId: "STL-DOUBLE-COMMIT",
      contractId: "CTR-000124",
      assetId: tokenised.token.assetId,
      tokenId: tokenised.token.tokenId,
      sellerParticipantId: "ORG-AAMHI-001",
      buyerParticipantId: "ORG-BUYER-001",
      quantity: 600,
      unitPrice: 20,
      expiry: "2026-10-20T18:00:00Z",
      submittedAt: "2026-10-01T12:07:30Z"
    }),
  /Seller does not hold enough unlocked asset/
);

const evaluated = settlementService.evaluateSettlement("STL-000001", "2026-10-01T12:08:00Z");
assert.equal(evaluated.state, "READY");

const settled = settlementService.settle({
  settlementId: "STL-000001",
  actorParticipantId: "ORG-BUYER-001",
  submittedAt: "2026-10-01T12:09:00Z"
});

assert.equal(settled.state, "SETTLED");
assert.equal(settled.dinrLeg.status, "RELEASED");
assert.equal(settled.assetLeg.status, "TRANSFERRED");
assert.equal(tokenised.token.holderBalances["ORG-AAMHI-001"], 500);
assert.equal(tokenised.token.holderBalances["ORG-BUYER-001"], 500);
assert.equal(tokenised.token.lockedBalances["ORG-AAMHI-001"], 0);
assert.equal(settlementService.getDinrBalance("ORG-AAMHI-001").balance, 10_000);
assert.equal(settlementService.getDinrBalance("ORG-BUYER-001").balance, 0);
assert.ok(settled.transactions.some((transaction) => transaction.type === "SETTLEMENT_SETTLED"));

assert.throws(
  () =>
    settlementService.fundSettlement({
      settlementId: "STL-000001",
      buyerParticipantId: "ORG-BUYER-001",
      submittedAt: "2026-10-01T12:10:00Z"
    }),
  /Settlement is closed/
);

console.log("Settlement service tests passed.");
