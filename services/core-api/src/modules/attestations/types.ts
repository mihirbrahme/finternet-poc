import type { DependencyMode } from "../../shared/dependencyModes.js";

export type Packet4AttestationType = "ASSET_VERIFIED";

export type AttestationStatus = "ACTIVE" | "REVOKED" | "DISPUTED";

export interface AssetVerifiedAttestationRecord {
  schemaVersion: "1.0";
  attestationId: string;
  type: Packet4AttestationType;
  assetId: string;
  attestorParticipantId: string;
  attestorDid: string;
  attestorAccount: string;
  quantity: number;
  unit: "kg";
  eventTime: string;
  evidenceManifestId: string;
  evidenceHash: string;
  credentialId?: string;
  signatureMode: "DEMO_UNSIGNED_ATTESTATION";
  status: AttestationStatus;
  chain: {
    dependencyMode: DependencyMode;
  };
}

export interface CreateAssetVerifiedAttestationInput {
  assetId: string;
  attestorParticipantId: string;
  attestorAccount: string;
  quantity: number;
  unit: "kg";
  eventTime?: string;
  evidenceManifestId: string;
  evidenceHash: string;
  credentialId?: string;
}
