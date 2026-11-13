import type { DependencyMode } from "../../shared/dependencyModes.js";
import type { AssetPublicMetadata, RecoveryAssetRecord } from "../assets/types.js";

export interface TokenMetadata {
  schemaVersion: "1.0";
  assetId: string;
  tokenId: string;
  name: string;
  description: string;
  materialCode: string;
  quantity: RecoveryAssetRecord["quantity"];
  originatorParticipantId: string;
  currentHolderParticipantId: string;
  evidenceRoot: string;
  verificationAttestationId: string;
  sourceAsset: AssetPublicMetadata;
  generatedAt: string;
}

export interface IpfsPublishResult {
  dependencyMode: DependencyMode;
  cid: string;
  uri: string;
  contentHash: string;
}

export interface SubmittedMintTransaction {
  dependencyMode: DependencyMode;
  status: "SUBMITTED";
  chainId: number;
  contractAddress: string;
  txHash: string;
  submittedAt: string;
}

export interface TokenisedAssetRecord {
  schemaVersion: "1.0";
  assetId: string;
  tokenId: string;
  totalSupply: number;
  holderBalances: Record<string, number>;
  lockedBalances: Record<string, number>;
  metadataUri: string;
  metadataCid: string;
  metadataHash: string;
  evidenceRoot: string;
  verificationAttestationId: string;
  mintTransaction: SubmittedMintTransaction;
}

export interface TokeniseAssetInput {
  assetId: string;
  tokeniserParticipantId: string;
  tokeniserAccount: string;
  tokeniserCredentialId: string;
  chainId?: number;
  contractAddress?: string;
  submittedAt?: string;
}

export interface TokeniseAssetResult {
  asset: RecoveryAssetRecord;
  metadata: TokenMetadata;
  ipfs: IpfsPublishResult;
  token: TokenisedAssetRecord;
  mintTransaction: SubmittedMintTransaction;
}
