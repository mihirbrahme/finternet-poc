import type { VerifiedDiscoveryResource } from "../../../../../beckn/consumer-node/index.js";
import type { ExplorerTokenReadModel } from "../../../../blockchain-indexer/index.js";
import type { DependencyMode } from "../../shared/dependencyModes.js";
import type { AssetPublicMetadata } from "../assets/index.js";
import type { CredentialVerificationResult } from "../credentials/index.js";
import type { ParticipantRole, ParticipantTrustView } from "../participants/index.js";
import type { SettlementRecord, SimulatedSettlementTransaction } from "../settlements/index.js";

export type AgentToolName =
  | "discoverAssets"
  | "getAsset"
  | "getTokenState"
  | "verifyParticipant"
  | "getCredentialStatus"
  | "prepareOffer"
  | "prepareSettlement"
  | "requestHumanApproval";

export interface BuyerAgentIntentConstraints {
  materialCode: string;
  state: "Maharashtra";
  district?: "Raigad";
  minQuantityKg: number;
  maxUnitPriceDinr: number;
  maxTransactionDinr: number;
  requireCredentialledSeller: boolean;
  expiryHours: number;
}

export interface BuyerAgentPolicy {
  allowedMaterialCode: string;
  maxTransactionDinr: number;
  maxAuthorityHours: number;
  requireCredentialledSeller: boolean;
}

export type PolicyCheckStatus = "PASS" | "FAIL";

export interface PolicyCheck {
  check: "TOTAL_WITHIN_LIMIT" | "MATERIAL_ALLOWED" | "SELLER_CREDENTIALLED" | "EXPIRY_WITHIN_AUTHORITY";
  status: PolicyCheckStatus;
  reason: string;
}

export interface PolicyDecision {
  allow: boolean;
  checks: PolicyCheck[];
  reasons: string[];
  dependencyMode: "LOCAL_MOCK";
}

export interface AgentProposalForPolicy {
  assetId: string;
  sellerParticipantId: string;
  materialCode: string;
  quantityKg: number;
  unitPriceDinr: number;
  paymentAmountDinr: number;
  sellerCredentialled: boolean;
  proposedAt: string;
  expiresAt: string;
}

export interface ParticipantVerificationResult {
  participant: ParticipantTrustView;
  requiredRole: ParticipantRole;
  activeCredentialIds: string[];
  verified: boolean;
  reason: string;
  dependencyMode: DependencyMode;
}

export interface AgentOfferDraft {
  offerId: string;
  contractId: string;
  assetId: string;
  tokenId: string;
  sellerParticipantId: string;
  buyerParticipantId: string;
  materialCode: string;
  quantityKg: number;
  unitPriceDinr: number;
  paymentAmountDinr: number;
  currencyToken: "dINR";
  evidenceBackedClaimBoundary: "OBP_READY_RECOVERY_CLAIM_NOT_OFFICIAL_CREDIT";
  dependencyMode: "LOCAL_MOCK";
  preparedAt: string;
}

export interface AgentSettlementDraft {
  settlement: SettlementRecord;
  submittedTransactionReference: SimulatedSettlementTransaction;
  dependencyMode: "LOCAL_MOCK";
}

export interface HumanApprovalRequest {
  approvalId: string;
  agentRunId: string;
  participantId: string;
  proposedAction: "CREATE_SETTLEMENT_DRAFT";
  counterparty: string;
  assetId: string;
  tokenId: string;
  quantityKg: number;
  unitPriceDinr: number;
  maximumAmountDinr: number;
  currency: "dINR";
  expiresAt: string;
  status: "PENDING";
  boundaryStatement: string;
  dependencyMode: "LOCAL_MOCK";
}

export interface CandidateAssessment {
  discovery: VerifiedDiscoveryResource;
  asset: AssetPublicMetadata;
  tokenState: ExplorerTokenReadModel;
  sellerVerification: ParticipantVerificationResult;
  credentialStatus: CredentialVerificationResult;
  eligible: boolean;
  reasons: string[];
}

export interface BuyerAgentTools {
  discoverAssets(input: BuyerAgentIntentConstraints): VerifiedDiscoveryResource[];
  getAsset(input: { assetId: string }): AssetPublicMetadata;
  getTokenState(input: { assetId?: string; tokenId?: string }): ExplorerTokenReadModel;
  verifyParticipant(input: {
    participantId: string;
    requiredRole: ParticipantRole;
    at: string;
  }): ParticipantVerificationResult;
  getCredentialStatus(input: {
    credentialId: string;
    requiredRole?: ParticipantRole;
    at: string;
  }): CredentialVerificationResult;
  prepareOffer(input: {
    agentRunId: string;
    buyerParticipantId: string;
    resource: VerifiedDiscoveryResource;
    quantityKg: number;
    preparedAt: string;
    contractId?: string;
  }): AgentOfferDraft;
  prepareSettlement(input: {
    offer: AgentOfferDraft;
    settlementId?: string;
    expiresAt: string;
    submittedAt: string;
  }): AgentSettlementDraft;
  requestHumanApproval(input: {
    agentRunId: string;
    buyerParticipantId: string;
    offer: AgentOfferDraft;
    expiresAt: string;
  }): HumanApprovalRequest;
}

export type AgentAuditEventType =
  | "USER_INSTRUCTION"
  | "TOOL_CALL"
  | "TOOL_OUTPUT"
  | "POLICY_CHECK"
  | "HUMAN_APPROVAL"
  | "SUBMITTED_TRANSACTION_REFERENCE";

export interface AgentAuditEvent {
  eventId: string;
  agentRunId: string;
  type: AgentAuditEventType;
  at: string;
  payload: Record<string, unknown>;
}

export interface BuyerAgentRunInput {
  agentRunId: string;
  userInstruction: string;
  buyerParticipantId: string;
  constraints: BuyerAgentIntentConstraints;
  now: string;
  contractId?: string;
  settlementId?: string;
}

export interface BuyerAgentRunResult {
  agentRunId: string;
  userInstruction: string;
  constraints: BuyerAgentIntentConstraints;
  candidates: CandidateAssessment[];
  selectedCandidate?: CandidateAssessment;
  offer?: AgentOfferDraft;
  settlementDraft?: AgentSettlementDraft;
  policyDecision?: PolicyDecision;
  approval?: HumanApprovalRequest;
  status: "PROPOSED_FOR_APPROVAL" | "DENIED" | "NO_ELIGIBLE_CANDIDATE";
}
