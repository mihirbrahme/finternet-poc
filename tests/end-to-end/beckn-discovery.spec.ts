import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BecknConsumerNode } from "../../beckn/consumer-node/index.js";
import { BecknDiscoverySandbox } from "../../beckn/discovery-sandbox/index.js";
import { BecknProviderNode } from "../../beckn/provider-node/index.js";
import { InMemoryBlockchainIndexer } from "../../services/blockchain-indexer/index.js";
import { RecoveryAssetService } from "../../services/core-api/src/modules/assets/index.js";
import { AttestationService } from "../../services/core-api/src/modules/attestations/index.js";
import { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import { EvidenceService } from "../../services/core-api/src/modules/evidence/index.js";
import { ParticipantRepository, ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { ParticipantRecord } from "../../services/core-api/src/modules/participants/index.js";
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

const tokeniserAccount = "0x1111111111111111111111111111111111111111";
const verifierAccount = "0x5555555555555555555555555555555555555555";
const sellerParticipantId = "ORG-AAMHI-001";

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
  participantId: sellerParticipantId,
  type: "RecoveryOriginatorCredential",
  roles: ["RECOVERY_ORIGINATOR"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: ["0x2222222222222222222222222222222222222222"],
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
  originatorParticipantId: sellerParticipantId,
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
  sourceParticipantId: sellerParticipantId,
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

const sellerTrust = participantService.getTrustView(sellerParticipantId);
const provider = new BecknProviderNode("beckn-pn-org-aamhi-001");
const catalogueResource = provider.publishResource({
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  sellerParticipantId,
  materialCode: tokenised.metadata.materialCode,
  materialName: "Low-density polyethylene",
  verifiedQuantity: tokenised.token.totalSupply,
  unit: "kg",
  chainId: tokenised.token.mintTransaction.chainId,
  contractAddress: tokenised.token.mintTransaction.contractAddress,
  metadataUri: tokenised.token.metadataUri,
  evidenceRoot: tokenised.token.evidenceRoot,
  verificationAttestationId: tokenised.token.verificationAttestationId,
  sellerDid: sellerTrust.did,
  sellerStatus: sellerTrust.status,
  credentialIds: sellerTrust.credentialIds,
  catalogueAvailableOverride: 900
});

assert.equal(catalogueResource.assetId, "RWA-RAI-2026-000001");
assert.equal(catalogueResource.tokenId, tokenised.token.tokenId);
assert.equal(catalogueResource.sellerParticipantId, sellerParticipantId);
assert.equal(catalogueResource.material.code, "PLASTIC-LDPE");
assert.equal(catalogueResource.quantity.catalogueAvailable, 900);
assert.deepEqual(catalogueResource.trust.credentialIds, ["VC-ORIGINATOR-000001"]);
assert.equal(catalogueResource.trust.originatorDid, sellerTrust.did);
assert.equal(catalogueResource.trust.verificationAttestationId, "ATT-000001");
assert.equal(catalogueResource.trust.evidenceRoot, tokenised.token.evidenceRoot);
assert.equal(catalogueResource.beckn.dependencyMode, "SANDBOX_ADAPTER");

const discovery = new BecknDiscoverySandbox();
discovery.registerProvider(provider);

const indexer = new InMemoryBlockchainIndexer();
indexer.index({
  type: "AssetMinted",
  txHash: tokenised.mintTransaction.txHash,
  blockNumber: 1,
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  to: sellerParticipantId,
  quantity: tokenised.token.totalSupply,
  metadataUri: tokenised.token.metadataUri,
  evidenceRoot: tokenised.token.evidenceRoot
});
indexer.index({
  type: "AssetLocked",
  txHash: "0xlock-packet-6-stale-catalogue",
  blockNumber: 2,
  tokenId: tokenised.token.tokenId,
  owner: sellerParticipantId,
  quantity: 350,
  settlementId: "STL-PACKET-7-PENDING"
});

const consumer = new BecknConsumerNode(
  discovery,
  participantService,
  credentialService,
  indexer,
  "2026-10-01T12:05:00Z"
);
const results = consumer.search({
  materialCode: "PLASTIC-LDPE",
  state: "Maharashtra",
  district: "Raigad",
  minQuantity: 500,
  requireVerifiedCredential: true
});

assert.equal(results.length, 1);
assert.equal(results[0].resource.assetId, "RWA-RAI-2026-000001");
assert.equal(results[0].resource.beckn.providerId, "beckn-pn-org-aamhi-001");
assert.equal(results[0].verification.sellerTrusted, true);
assert.equal(results[0].verification.tokenExists, true);
assert.equal(results[0].verification.evidenceRootMatches, true);
assert.equal(results[0].tokenState.balances[sellerParticipantId], 1000);
assert.equal(results[0].tokenState.lockedBalances[sellerParticipantId], 350);
assert.equal(results[0].verification.liveAvailableQuantity, 650);
assert.equal(results[0].verification.selectableQuantity, 650);
assert.equal(results[0].verification.staleCatalogueCapped, true);
assert.equal(results[0].verification.selectionEnabled, false);
assert.equal(results[0].verification.selectionDisabledReason, "SETTLEMENT_PACKET_7_NOT_AVAILABLE");

console.log("Beckn discovery sandbox tests passed.");
