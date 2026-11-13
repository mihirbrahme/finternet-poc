import type { DependencyMode } from "../../shared/dependencyModes.js";

export type SettlementState = "CREATED" | "FUNDED" | "ASSET_LOCKED" | "READY" | "SETTLED" | "REFUNDED" | "EXPIRED";

export type SettlementTransactionType =
  | "SETTLEMENT_CREATED"
  | "DINR_FUNDED"
  | "ASSET_LOCKED"
  | "SETTLEMENT_EVALUATED"
  | "SETTLEMENT_SETTLED"
  | "SETTLEMENT_REFUNDED"
  | "SETTLEMENT_EXPIRED";

export interface SimulatedSettlementTransaction {
  dependencyMode: DependencyMode;
  type: SettlementTransactionType;
  status: "SUBMITTED";
  chainId: number;
  contractAddress: string;
  txHash: string;
  submittedAt: string;
}

export interface SettlementLegState {
  participantId: string;
  accountAddress?: string;
  amount: number;
  status: "PENDING" | "LOCKED" | "RELEASED" | "REFUNDED";
  txHash?: string;
}

export interface AssetSettlementLegState {
  assetId: string;
  tokenId: string;
  sellerParticipantId: string;
  buyerParticipantId: string;
  quantity: number;
  unit: "kg";
  status: "PENDING" | "LOCKED" | "TRANSFERRED" | "UNLOCKED";
  txHash?: string;
}

export interface SettlementRecord {
  schemaVersion: "1.0";
  settlementId: string;
  contractId: string;
  assetId: string;
  tokenId: string;
  sellerParticipantId: string;
  buyerParticipantId: string;
  quantity: number;
  unitPrice: number;
  paymentAmount: number;
  currencyToken: "dINR";
  settlementType: "SIMPLE_DVP" | "CONDITIONAL_DVP";
  requiredAttestationType?: "RECEIPT_CONFIRMED";
  state: SettlementState;
  expiry: string;
  dinrLeg: SettlementLegState;
  assetLeg: AssetSettlementLegState;
  transactions: SimulatedSettlementTransaction[];
  dependencyMode: DependencyMode;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSettlementInput {
  settlementId?: string;
  contractId: string;
  assetId: string;
  tokenId: string;
  sellerParticipantId: string;
  buyerParticipantId: string;
  quantity: number;
  unitPrice: number;
  settlementType?: "SIMPLE_DVP" | "CONDITIONAL_DVP";
  requiredAttestationType?: "RECEIPT_CONFIRMED";
  expiry: string;
  chainId?: number;
  contractAddress?: string;
  submittedAt?: string;
}

export interface FundSettlementInput {
  settlementId: string;
  buyerParticipantId: string;
  buyerAccount?: string;
  amount?: number;
  chainId?: number;
  contractAddress?: string;
  submittedAt?: string;
}

export interface LockAssetInput {
  settlementId: string;
  sellerParticipantId: string;
  sellerAccount?: string;
  chainId?: number;
  contractAddress?: string;
  submittedAt?: string;
}

export interface SettlementActionInput {
  settlementId: string;
  actorParticipantId: string;
  chainId?: number;
  contractAddress?: string;
  submittedAt?: string;
}

export interface MintDinrInput {
  participantId: string;
  amount: number;
  treasuryParticipantId: string;
  treasuryCredentialId: string;
  treasuryAccount?: string;
  submittedAt?: string;
}

export interface DinrBalanceView {
  participantId: string;
  balance: number;
  currencyToken: "dINR";
  dependencyMode: DependencyMode;
}
