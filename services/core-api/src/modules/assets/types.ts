import type { EvidenceManifestPublicView } from "../evidence/types.js";

export type AssetVerificationStatus = "DRAFT" | "EVIDENCE_SUBMITTED" | "VERIFIED" | "REJECTED" | "DISPUTED";

export type AssetLifecycleStatus = "CREATED" | "VERIFIED" | "TOKENISED" | "PARTIALLY_SETTLED" | "SETTLED" | "RETIRED";

export interface RecoveryAssetRecord {
  schemaVersion: "1.0";
  assetId: string;
  originatorParticipantId: string;
  materialCode: string;
  quantity: {
    estimated: number;
    verified: number;
    unit: "kg";
  };
  origin: {
    country: "IN";
    state: "Maharashtra";
    district: "Raigad";
    locationReference?: string;
  };
  collectionContext: {
    villageOrRoute: string;
    collectionType: "RURAL_SWM" | "COASTAL_CLEANUP" | "MANGROVE_CLEANUP" | "AGGREGATION_CENTER";
    obpRiskContext?: "COASTAL_COMMUNITY" | "WATERWAY_ADJACENT" | "POTENTIAL_OBP" | "NOT_ASSESSED";
  };
  quality: {
    grade: "UNSORTED" | "SORTED" | "BALED" | "PROCESSOR_ACCEPTED";
    contaminationPercent: number;
  };
  custody: {
    currentParticipantId: string;
    facilityReference: string;
  };
  verificationStatus: AssetVerificationStatus;
  lifecycleStatus: AssetLifecycleStatus;
  evidenceManifestId: string;
  evidenceRoot?: string;
  verificationAttestationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecoveryAssetInput {
  assetId?: string;
  originatorParticipantId: string;
  materialCode: string;
  estimatedQuantity: number;
  verifiedQuantity?: number;
  villageOrRoute: string;
  collectionType: RecoveryAssetRecord["collectionContext"]["collectionType"];
  obpRiskContext?: RecoveryAssetRecord["collectionContext"]["obpRiskContext"];
  locationReference?: string;
  qualityGrade?: RecoveryAssetRecord["quality"]["grade"];
  contaminationPercent?: number;
  facilityReference: string;
  createdAt?: string;
}

export interface AssetProvenanceEvent {
  eventType: "ASSET_CREATED" | "EVIDENCE_MANIFEST_CREATED" | "ASSET_VERIFIED";
  at: string;
  actorParticipantId: string;
  referenceId: string;
  summary: string;
}

export interface AssetPublicMetadata {
  schemaVersion: "1.0";
  assetId: string;
  materialCode: string;
  quantity: RecoveryAssetRecord["quantity"];
  origin: RecoveryAssetRecord["origin"];
  collectionContext: RecoveryAssetRecord["collectionContext"];
  originatorParticipantId: string;
  verification: {
    status: AssetVerificationStatus;
    evidenceRoot?: string;
    attestationId?: string;
  };
  evidenceManifest?: EvidenceManifestPublicView;
}
