import type { DependencyMode } from "../../shared/dependencyModes.js";

export type EvidenceType =
  | "COLLECTION_PHOTO"
  | "SEGREGATION_PHOTO"
  | "WEIGHMENT_SLIP"
  | "STORAGE_RECORD"
  | "DISPATCH_RECORD"
  | "PROCESSOR_RECEIPT"
  | "OBP_ELIGIBILITY_EVIDENCE";

export type EvidenceClassification = "PUBLIC_SAFE" | "CONFIDENTIAL" | "RESTRICTED";

export type EvidenceStorageClass = "PRIVATE_OBJECT_STORE" | "PUBLIC_IPFS_METADATA" | "LOCAL_SAMPLE";

export interface EvidenceItemRecord {
  schemaVersion: "1.0";
  evidenceId: string;
  assetId: string;
  type: EvidenceType;
  description?: string;
  contentHashAlgorithm: "SHA-256";
  contentHash: string;
  mimeType: string;
  storageClass: EvidenceStorageClass;
  storageReference: string;
  sourceParticipantId: string;
  capturedAt: string;
  classification: EvidenceClassification;
}

export interface EvidencePublicReference {
  evidenceId: string;
  type: EvidenceType;
  contentHashAlgorithm: "SHA-256";
  contentHash: string;
  mimeType: string;
  classification: EvidenceClassification;
  publicAccess: "HASH_ONLY" | "PUBLIC_METADATA";
}

export interface EvidenceManifestRecord {
  schemaVersion: "1.0";
  manifestId: string;
  assetId: string;
  evidence: EvidenceItemRecord[];
  createdAt: string;
  manifestHashAlgorithm: "SHA-256-CANONICAL-JSON";
  manifestHash: string;
  dependencyMode: DependencyMode;
}

export interface EvidenceManifestPublicView {
  schemaVersion: "1.0";
  manifestId: string;
  assetId: string;
  evidence: EvidencePublicReference[];
  createdAt: string;
  manifestHashAlgorithm: "SHA-256-CANONICAL-JSON";
  manifestHash: string;
  dependencyMode: DependencyMode;
}

export interface CreateEvidenceInput {
  assetId: string;
  type: EvidenceType;
  content: Buffer | string;
  mimeType: string;
  storageReference: string;
  sourceParticipantId: string;
  classification: EvidenceClassification;
  description?: string;
  evidenceId?: string;
  storageClass?: EvidenceStorageClass;
  capturedAt?: string;
}
