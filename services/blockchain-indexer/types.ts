import type { DependencyMode } from "../core-api/src/shared/dependencyModes.js";

export type IndexedEvent =
  | {
      type: "AssetMinted";
      txHash: string;
      blockNumber: number;
      assetId: string;
      tokenId: string;
      to: string;
      quantity: number;
      metadataUri: string;
      evidenceRoot: string;
    }
  | {
      type: "TransferSingle";
      txHash: string;
      blockNumber: number;
      tokenId: string;
      from: string;
      to: string;
      quantity: number;
    }
  | {
      type: "AssetLocked";
      txHash: string;
      blockNumber: number;
      tokenId: string;
      owner: string;
      quantity: number;
      settlementId: string;
    }
  | {
      type: "AssetUnlocked";
      txHash: string;
      blockNumber: number;
      tokenId: string;
      owner: string;
      quantity: number;
      settlementId: string;
    };

export interface ExplorerTokenReadModel {
  assetId: string;
  tokenId: string;
  totalSupply: number;
  balances: Record<string, number>;
  lockedBalances: Record<string, number>;
  metadataUri: string;
  evidenceRoot: string;
  mintTxHash: string;
  lastTxHash: string;
  dependencyMode: DependencyMode;
}
