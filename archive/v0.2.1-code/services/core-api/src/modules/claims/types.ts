import type { DependencyMode } from "../../shared/dependencyModes.js";

export type ClaimType =
  | "RECOVERY_COLLECTED"
  | "ASSET_VERIFIED"
  | "RECEIPT_CONFIRMED"
  | "PROCESSING_CONFIRMED"
  | "OBP_READY_RECOVERY_CLAIM"
  | "SPONSOR_ATTRIBUTION"
  | "EPR_REFERENCE";

export type ClaimStatus = "ACTIVE" | "CONSUMED" | "REVOKED" | "DISPUTED";

export interface ClaimBasis {
  obpRiskCategory?: "COASTAL_COMMUNITY" | "WATERWAY_ADJACENT" | "POTENTIAL_OBP" | "NOT_ASSESSED";
  originDistrict?: string;
  originState?: string;
  isOfficialCredit: boolean;
  certificationRegistry: string | null;
  boundaryStatement?: string;
}

export interface ClaimRecord {
  schemaVersion: "1.0";
  claimId: string;
  type: ClaimType;
  assetId: string;
  tokenId: string;
  sourceAttestationIds: string[];
  issuerParticipantId: string;
  holderParticipantId: string;
  quantity: number;
  unit: "kg";
  exclusive: boolean;
  claimBasis: ClaimBasis;
  evidenceReferences: {
    evidenceManifestId: string;
    evidenceHash: string;
  }[];
  status: ClaimStatus;
  externalReference: string | null;
  chain: {
    dependencyMode: DependencyMode;
    txHash?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimInput {
  claimId?: string;
  type: ClaimType;
  assetId: string;
  tokenId: string;
  sourceAttestationIds: string[];
  issuerParticipantId: string;
  holderParticipantId: string;
  quantity: number;
  unit: "kg";
  exclusive?: boolean;
  claimBasis: ClaimBasis;
  externalReference?: string | null;
  createdAt?: string;
}

export interface ClaimActionInput {
  claimId: string;
  actorParticipantId: string;
  actedAt?: string;
}
