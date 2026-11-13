import type { DependencyMode } from "../../shared/dependencyModes.js";

export type AttestationType = "ASSET_VERIFIED" | "RECEIPT_CONFIRMED" | "PROCESSING_CONFIRMED";

export type AttestationStatus = "ACTIVE" | "REVOKED" | "DISPUTED";

export interface AttestationRecord {
  schemaVersion: "1.0";
  attestationId: string;
  type: AttestationType;
  assetId: string;
  tokenId?: string;
  settlementId?: string;
  attestorParticipantId: string;
  attestorDid: string;
  attestorAccount: string;
  quantity: number;
  unit: "kg";
  eventTime: string;
  evidenceManifestId: string;
  evidenceHash: string;
  credentialId?: string;
  signatureMode: "DEMO_UNSIGNED_ATTESTATION" | "DEMO_PARTICIPANT_SIGNED_ATTESTATION";
  status: AttestationStatus;
  chain: {
    dependencyMode: DependencyMode;
    txHash?: string;
  };
}

export type AssetVerifiedAttestationRecord = AttestationRecord & {
  type: "ASSET_VERIFIED";
};

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

export interface CreateOperationalAttestationInput {
  type: "RECEIPT_CONFIRMED" | "PROCESSING_CONFIRMED";
  assetId: string;
  tokenId: string;
  settlementId: string;
  attestorParticipantId: string;
  attestorAccount: string;
  quantity: number;
  unit: "kg";
  eventTime?: string;
  evidenceManifestId: string;
  evidenceHash: string;
  credentialId?: string;
}
