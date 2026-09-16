import type { TokenisedAssetRecord } from "./types.js";

export class TokenisationRepository {
  private readonly recordsByAssetId = new Map<string, TokenisedAssetRecord>();
  private readonly recordsByTokenId = new Map<string, TokenisedAssetRecord>();

  save(record: TokenisedAssetRecord): TokenisedAssetRecord {
    this.recordsByAssetId.set(record.assetId, record);
    this.recordsByTokenId.set(record.tokenId, record);
    return record;
  }

  getByAssetId(assetId: string): TokenisedAssetRecord | undefined {
    return this.recordsByAssetId.get(assetId);
  }

  getByTokenId(tokenId: string): TokenisedAssetRecord | undefined {
    return this.recordsByTokenId.get(tokenId);
  }

  list(): TokenisedAssetRecord[] {
    return [...this.recordsByAssetId.values()];
  }
}
