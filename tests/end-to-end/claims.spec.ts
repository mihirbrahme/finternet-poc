import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RecoveryAssetService } from "../../services/core-api/src/modules/assets/index.js";
import { AttestationService } from "../../services/core-api/src/modules/attestations/index.js";
import { ClaimService } from "../../services/core-api/src/modules/claims/index.js";
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
const claimService = new ClaimService(
  participantService,
  credentialService,
  assetService,
  attestationService,
  tokenisationService
);

const tokeniserAccount = "0x1111111111111111111111111111111111111111";
const sellerAccount = "0x2222222222222222222222222222222222222222";
const buyerAccount = "0x3333333333333333333333333333333333333333";
const processorAccount = "0x4444444444444444444444444444444444444444";
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
  credentialId: "VC-PROCESSOR-000001",
  participantId: "ORG-PROCESSOR-001",
  type: "ProcessorCredential",
  roles: ["PROCESSOR"],
  materialClasses: ["PLASTIC-LDPE"],
  ethereumAccounts: [processorAccount],
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

evidenceService.createEvidence({
  evidenceId: "EVD-000002",
  assetId: asset.assetId,
  type: "PROCESSOR_RECEIPT",
  content: "processor receipt for 500kg accepted material",
  mimeType: "application/pdf",
  storageReference: "s3://private/aamhi-demo/EVD-000002.pdf",
  sourceParticipantId: "ORG-PROCESSOR-001",
  classification: "RESTRICTED",
  capturedAt: "2026-10-01T15:00:00Z"
});

const manifest = assetService.attachEvidenceManifest(asset.assetId, {
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

settlementService.mintDinr({
  participantId: "ORG-BUYER-001",
  amount: 10_000,
  treasuryParticipantId: "ORG-SUMA-001",
  treasuryCredentialId: "VC-NETWORK-ADMIN-000001",
  treasuryAccount: tokeniserAccount,
  submittedAt: "2026-10-01T12:04:00Z"
});

settlementService.createSettlement({
  settlementId: "STL-000001",
  contractId: "CTR-000123",
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  sellerParticipantId: "ORG-AAMHI-001",
  buyerParticipantId: "ORG-BUYER-001",
  quantity: 500,
  unitPrice: 20,
  settlementType: "CONDITIONAL_DVP",
  requiredAttestationType: "RECEIPT_CONFIRMED",
  expiry: "2026-10-20T18:00:00Z",
  submittedAt: "2026-10-01T12:05:00Z"
});

settlementService.fundSettlement({
  settlementId: "STL-000001",
  buyerParticipantId: "ORG-BUYER-001",
  buyerAccount,
  submittedAt: "2026-10-01T12:06:00Z"
});
settlementService.lockAsset({
  settlementId: "STL-000001",
  sellerParticipantId: "ORG-AAMHI-001",
  sellerAccount,
  submittedAt: "2026-10-01T12:07:00Z"
});

assert.throws(
  () =>
    attestationService.createOperationalAttestation({
      type: "RECEIPT_CONFIRMED",
      assetId: tokenised.token.assetId,
      tokenId: tokenised.token.tokenId,
      settlementId: "STL-000001",
      attestorParticipantId: "ORG-BUYER-001",
      attestorAccount: buyerAccount,
      quantity: 500,
      unit: "kg",
      evidenceManifestId: manifest.manifestId,
      evidenceHash: manifest.manifestHash,
      eventTime: "2026-10-01T15:00:00Z"
    }),
  /Participant is not a processor/
);

const receiptAttestation = attestationService.createOperationalAttestation({
  type: "RECEIPT_CONFIRMED",
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  settlementId: "STL-000001",
  attestorParticipantId: "ORG-PROCESSOR-001",
  attestorAccount: processorAccount,
  credentialId: "VC-PROCESSOR-000001",
  quantity: 500,
  unit: "kg",
  evidenceManifestId: manifest.manifestId,
  evidenceHash: manifest.manifestHash,
  eventTime: "2026-10-01T15:00:00Z"
});

assert.equal(receiptAttestation.type, "RECEIPT_CONFIRMED");
assert.equal(receiptAttestation.chain.dependencyMode, "LOCAL_MOCK");

assert.throws(
  () =>
    claimService.createClaim({
      claimId: "CLM-EXCESS",
      type: "OBP_READY_RECOVERY_CLAIM",
      assetId: tokenised.token.assetId,
      tokenId: tokenised.token.tokenId,
      sourceAttestationIds: [receiptAttestation.attestationId],
      issuerParticipantId: "ORG-AAMHI-001",
      holderParticipantId: "ORG-BUYER-001",
      quantity: 501,
      unit: "kg",
      claimBasis: {
        obpRiskCategory: "COASTAL_COMMUNITY",
        originDistrict: "Raigad",
        originState: "Maharashtra",
        isOfficialCredit: false,
        certificationRegistry: null
      },
      createdAt: "2026-10-01T15:10:00Z"
    }),
  /exceeds eligible/
);

assert.throws(
  () =>
    claimService.createClaim({
      claimId: "CLM-OFFICIAL",
      type: "OBP_READY_RECOVERY_CLAIM",
      assetId: tokenised.token.assetId,
      tokenId: tokenised.token.tokenId,
      sourceAttestationIds: [receiptAttestation.attestationId],
      issuerParticipantId: "ORG-AAMHI-001",
      holderParticipantId: "ORG-BUYER-001",
      quantity: 500,
      unit: "kg",
      claimBasis: {
        obpRiskCategory: "COASTAL_COMMUNITY",
        originDistrict: "Raigad",
        originState: "Maharashtra",
        isOfficialCredit: true,
        certificationRegistry: null
      },
      createdAt: "2026-10-01T15:11:00Z"
    }),
  /isOfficialCredit/
);

const claim = claimService.createClaim({
  claimId: "CLM-000001",
  type: "OBP_READY_RECOVERY_CLAIM",
  assetId: tokenised.token.assetId,
  tokenId: tokenised.token.tokenId,
  sourceAttestationIds: [receiptAttestation.attestationId],
  issuerParticipantId: "ORG-AAMHI-001",
  holderParticipantId: "ORG-BUYER-001",
  quantity: 500,
  unit: "kg",
  claimBasis: {
    obpRiskCategory: "COASTAL_COMMUNITY",
    originDistrict: "Raigad",
    originState: "Maharashtra",
    isOfficialCredit: false,
    certificationRegistry: null
  },
  createdAt: "2026-10-01T15:15:00Z"
});

assert.equal(claim.claimId, "CLM-000001");
assert.equal(claim.claimBasis.isOfficialCredit, false);
assert.match(claim.claimBasis.boundaryStatement ?? "", /not official OBP credit issuance/);
assert.equal(claim.evidenceReferences[0]?.evidenceHash, manifest.manifestHash);

assert.throws(
  () =>
    claimService.createClaim({
      claimId: "CLM-000002",
      type: "OBP_READY_RECOVERY_CLAIM",
      assetId: tokenised.token.assetId,
      tokenId: tokenised.token.tokenId,
      sourceAttestationIds: [receiptAttestation.attestationId],
      issuerParticipantId: "ORG-AAMHI-001",
      holderParticipantId: "ORG-BUYER-001",
      quantity: 1,
      unit: "kg",
      claimBasis: {
        obpRiskCategory: "COASTAL_COMMUNITY",
        originDistrict: "Raigad",
        originState: "Maharashtra",
        isOfficialCredit: false,
        certificationRegistry: null
      },
      createdAt: "2026-10-01T15:20:00Z"
    }),
  /Claim conflict/
);

const consumed = claimService.consumeClaim({
  claimId: "CLM-000001",
  actorParticipantId: "ORG-BUYER-001",
  actedAt: "2026-10-01T15:30:00Z"
});
assert.equal(consumed.status, "CONSUMED");
assert.equal(claimService.listClaimsByAsset(tokenised.token.assetId).length, 1);

console.log("Claims and attestations service tests passed.");
