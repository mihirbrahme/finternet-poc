import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RecoveryAssetService } from "../../services/core-api/src/modules/assets/index.js";
import { AttestationService } from "../../services/core-api/src/modules/attestations/index.js";
import { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import { EvidenceService } from "../../services/core-api/src/modules/evidence/index.js";
import { ParticipantRepository, ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { ParticipantRecord } from "../../services/core-api/src/modules/participants/index.js";
import { TokenisationService, deriveTokenId } from "../../services/core-api/src/modules/tokenisation/index.js";
import { InMemoryBlockchainIndexer } from "../../services/blockchain-indexer/index.js";

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

const tokeniserAccount = "0x1111111111111111111111111111111111111111";
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
  credentialId: "VC-VERIFIER-000001",
  participantId: "ORG-VERIFIER-001",
  type: "VerifierCredential",
  roles: ["VERIFIER"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: [verifierAccount],
  validFrom: "2026-10-01T00:00:00Z",
  validUntil: "2027-03-31T23:59:59Z"
});

const draftAsset = assetService.createAsset({
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

assert.throws(
  () =>
    tokenisationService.tokeniseAsset({
      assetId: draftAsset.assetId,
      tokeniserParticipantId: "ORG-SUMA-001",
      tokeniserAccount,
      tokeniserCredentialId: "VC-NETWORK-ADMIN-000001",
      submittedAt: "2026-10-01T12:00:00Z"
    }),
  /Asset is not verified/
);

evidenceService.createEvidence({
  evidenceId: "EVD-000001",
  assetId: draftAsset.assetId,
  type: "WEIGHMENT_SLIP",
  content: "weighment slip 1000kg ldpe lot",
  mimeType: "application/pdf",
  storageReference: "s3://private/aamhi-demo/EVD-000001.pdf",
  sourceParticipantId: "ORG-AAMHI-001",
  classification: "RESTRICTED",
  capturedAt: "2026-10-01T10:00:00Z"
});

assetService.attachEvidenceManifest(draftAsset.assetId, {
  manifestId: "EVM-000001",
  createdAt: "2026-10-01T10:15:00Z"
});

const verifiedAsset = assetService.verifyAsset({
  assetId: draftAsset.assetId,
  verifierParticipantId: "ORG-VERIFIER-001",
  verifierAccount,
  credentialId: "VC-VERIFIER-000001",
  eventTime: "2026-10-01T11:00:00Z"
});

assert.equal(verifiedAsset.verificationStatus, "VERIFIED");
assert.ok(verifiedAsset.evidenceRoot);
assert.equal(verifiedAsset.verificationAttestationId, "ATT-000001");

assert.throws(
  () =>
    tokenisationService.tokeniseAsset({
      assetId: verifiedAsset.assetId,
      tokeniserParticipantId: "ORG-AAMHI-001",
      tokeniserAccount,
      tokeniserCredentialId: "VC-NETWORK-ADMIN-000001",
      submittedAt: "2026-10-01T11:59:00Z"
    }),
  /Tokeniser credential does not belong to participant/
);

const tokenised = tokenisationService.tokeniseAsset({
  assetId: verifiedAsset.assetId,
  tokeniserParticipantId: "ORG-SUMA-001",
  tokeniserAccount,
  tokeniserCredentialId: "VC-NETWORK-ADMIN-000001",
  submittedAt: "2026-10-01T12:00:00Z"
});

assert.equal(tokenised.asset.lifecycleStatus, "TOKENISED");
assert.equal(tokenised.token.assetId, "RWA-RAI-2026-000001");
assert.equal(tokenised.token.totalSupply, 1000);
assert.equal(tokenised.token.holderBalances["ORG-AAMHI-001"], 1000);
assert.equal(tokenised.token.tokenId, deriveTokenId("RWA-RAI-2026-000001"));
assert.equal(tokenised.ipfs.dependencyMode, "LOCAL_MOCK");
assert.match(tokenised.ipfs.uri, /^ipfs:\/\/bafy-local-/);
assert.equal(tokenised.metadata.evidenceRoot, verifiedAsset.evidenceRoot);
assert.equal(tokenised.mintTransaction.status, "SUBMITTED");
assert.equal(tokenised.mintTransaction.dependencyMode, "LOCAL_MOCK");

assert.throws(
  () =>
    tokenisationService.tokeniseAsset({
      assetId: verifiedAsset.assetId,
      tokeniserParticipantId: "ORG-SUMA-001",
      tokeniserAccount,
      tokeniserCredentialId: "VC-NETWORK-ADMIN-000001",
      submittedAt: "2026-10-01T12:01:00Z"
    }),
  /Asset already tokenised/
);

const indexer = new InMemoryBlockchainIndexer();
const holder = "ORG-AAMHI-001";
indexer.index({
  type: "AssetMinted",
  txHash: tokenised.mintTransaction.txHash,
  blockNumber: 1,
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  to: holder,
  quantity: tokenised.token.totalSupply,
  metadataUri: tokenised.token.metadataUri,
  evidenceRoot: tokenised.token.evidenceRoot
});
indexer.index({
  type: "AssetLocked",
  txHash: "0xlock",
  blockNumber: 2,
  tokenId: tokenised.token.tokenId,
  owner: holder,
  quantity: 250,
  settlementId: "STL-000001"
});
indexer.index({
  type: "AssetUnlocked",
  txHash: "0xunlock",
  blockNumber: 3,
  tokenId: tokenised.token.tokenId,
  owner: holder,
  quantity: 100,
  settlementId: "STL-000001"
});

const readModel = indexer.getAsset("RWA-RAI-2026-000001");
assert.ok(readModel);
assert.equal(readModel.tokenId, tokenised.token.tokenId);
assert.equal(readModel.totalSupply, 1000);
assert.equal(readModel.balances[holder], 1000);
assert.equal(readModel.lockedBalances[holder], 150);
assert.equal(readModel.metadataUri, tokenised.token.metadataUri);
assert.equal(readModel.evidenceRoot, tokenised.token.evidenceRoot);
assert.equal(readModel.mintTxHash, tokenised.mintTransaction.txHash);
assert.equal(readModel.lastTxHash, "0xunlock");

console.log("Tokenisation and indexer tests passed.");
