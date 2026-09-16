import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RecoveryAssetService } from "../../services/core-api/src/modules/assets/index.js";
import { AttestationService } from "../../services/core-api/src/modules/attestations/index.js";
import { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import { EvidenceService } from "../../services/core-api/src/modules/evidence/index.js";
import { ParticipantRepository, ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { ParticipantRecord } from "../../services/core-api/src/modules/participants/index.js";

const root = process.cwd();

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

const participants = readJson<ParticipantRecord[]>("samples/aamhi-demo/participants.json");
const participantService = new ParticipantService(new ParticipantRepository(participants));
const credentialService = new CredentialService(participantService);
const evidenceService = new EvidenceService();
const attestationService = new AttestationService(participantService, credentialService);
const assetService = new RecoveryAssetService(
  participantService,
  evidenceService,
  attestationService
);

const sample = readJson<{
  assetId: string;
  originatorParticipantId: string;
  materialCode: string;
  quantity: { estimated: number; verified: number; unit: "kg" };
  origin: { locationReference?: string };
  collectionContext: {
    villageOrRoute: string;
    collectionType: "RURAL_SWM" | "COASTAL_CLEANUP" | "MANGROVE_CLEANUP" | "AGGREGATION_CENTER";
    obpRiskContext?: "COASTAL_COMMUNITY" | "WATERWAY_ADJACENT" | "POTENTIAL_OBP" | "NOT_ASSESSED";
  };
  quality: { grade: "UNSORTED" | "SORTED" | "BALED" | "PROCESSOR_ACCEPTED"; contaminationPercent: number };
  custody: { facilityReference: string };
  createdAt: string;
}>("samples/aamhi-demo/recovery-asset.json");

const verifierAccount = "0x5555555555555555555555555555555555555555";

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

const buyerAccount = "0x3333333333333333333333333333333333333333";

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

const hashA = evidenceService.hashContent("same weighment payload");
const hashB = evidenceService.hashContent("same weighment payload");
const hashChanged = evidenceService.hashContent("same weighment payload.");
assert.equal(hashA, hashB);
assert.notEqual(hashA, hashChanged);

const asset = assetService.createAsset({
  assetId: sample.assetId,
  originatorParticipantId: sample.originatorParticipantId,
  materialCode: sample.materialCode,
  estimatedQuantity: sample.quantity.estimated,
  verifiedQuantity: sample.quantity.verified,
  villageOrRoute: sample.collectionContext.villageOrRoute,
  collectionType: sample.collectionContext.collectionType,
  obpRiskContext: sample.collectionContext.obpRiskContext,
  locationReference: sample.origin.locationReference,
  qualityGrade: sample.quality.grade,
  contaminationPercent: sample.quality.contaminationPercent,
  facilityReference: sample.custody.facilityReference,
  createdAt: sample.createdAt
});

assert.equal(asset.assetId, "RWA-RAI-2026-000001");
assert.equal(asset.verificationStatus, "DRAFT");
assert.equal(asset.lifecycleStatus, "CREATED");

evidenceService.createEvidence({
  evidenceId: "EVD-000001",
  assetId: asset.assetId,
  type: "COLLECTION_PHOTO",
  content: "photo bytes for Nandgaon collection route",
  mimeType: "image/jpeg",
  storageReference: "s3://private/aamhi-demo/EVD-000001.jpg",
  sourceParticipantId: "ORG-AAMHI-001",
  classification: "CONFIDENTIAL",
  capturedAt: "2026-10-01T09:30:00Z"
});

evidenceService.createEvidence({
  evidenceId: "EVD-000002",
  assetId: asset.assetId,
  type: "WEIGHMENT_SLIP",
  content: "weighment slip 1000kg ldpe lot",
  mimeType: "application/pdf",
  storageReference: "s3://private/aamhi-demo/EVD-000002.pdf",
  sourceParticipantId: "ORG-AAMHI-001",
  classification: "RESTRICTED",
  capturedAt: "2026-10-01T10:00:00Z"
});

const manifest = assetService.attachEvidenceManifest(asset.assetId, {
  manifestId: "EVM-000001",
  createdAt: "2026-10-01T10:15:00Z"
});
const repeatedManifest = evidenceService.createManifest(asset.assetId, {
  manifestId: "EVM-000001",
  createdAt: "2026-10-01T10:15:00Z"
});

assert.equal(manifest.manifestHash, repeatedManifest.manifestHash);
assert.equal(assetService.requireAsset(asset.assetId).evidenceRoot, manifest.manifestHash);

const publicMetadata = assetService.toPublicMetadata(asset.assetId);
assert.equal(publicMetadata.evidenceManifest?.evidence[0]?.publicAccess, "HASH_ONLY");
assert.equal("storageReference" in (publicMetadata.evidenceManifest?.evidence[0] ?? {}), false);

assert.throws(
  () =>
    assetService.verifyAsset({
      assetId: asset.assetId,
      verifierParticipantId: "ORG-BUYER-001",
      verifierAccount: buyerAccount,
      credentialId: "VC-BUYER-000001",
      eventTime: "2026-10-01T11:00:00Z"
    }),
  /Participant is not a verifier/
);

const verifiedAsset = assetService.verifyAsset({
  assetId: asset.assetId,
  verifierParticipantId: "ORG-VERIFIER-001",
  verifierAccount: verifierAccount,
  credentialId: "VC-VERIFIER-000001",
  eventTime: "2026-10-01T11:00:00Z"
});

assert.equal(verifiedAsset.assetId, "RWA-RAI-2026-000001");
assert.equal(verifiedAsset.verificationStatus, "VERIFIED");
assert.equal(verifiedAsset.lifecycleStatus, "VERIFIED");
assert.equal(verifiedAsset.evidenceRoot, manifest.manifestHash);
assert.equal(verifiedAsset.verificationAttestationId, "ATT-000001");

const attestation = attestationService.getAttestation("ATT-000001");
assert.ok(attestation);
assert.equal(attestation.type, "ASSET_VERIFIED");
assert.equal(attestation.chain.dependencyMode, "NOT_CONNECTED");
assert.equal(attestation.evidenceHash, manifest.manifestHash);

const provenance = assetService.getProvenance(asset.assetId);
assert.deepEqual(
  provenance.map((event) => event.eventType),
  ["ASSET_CREATED", "EVIDENCE_MANIFEST_CREATED", "ASSET_VERIFIED"]
);

console.log("Asset evidence and verification tests passed.");
