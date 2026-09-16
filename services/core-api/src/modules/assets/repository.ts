import type { AssetProvenanceEvent, RecoveryAssetRecord } from "./types.js";

export class RecoveryAssetRepository {
  private readonly assets = new Map<string, RecoveryAssetRecord>();
  private readonly provenance = new Map<string, AssetProvenanceEvent[]>();

  save(asset: RecoveryAssetRecord): RecoveryAssetRecord {
    this.assets.set(asset.assetId, asset);
    return asset;
  }

  list(): RecoveryAssetRecord[] {
    return [...this.assets.values()];
  }

  get(assetId: string): RecoveryAssetRecord | undefined {
    return this.assets.get(assetId);
  }

  require(assetId: string): RecoveryAssetRecord {
    const asset = this.get(assetId);
    if (!asset) {
      throw new Error(`Recovery asset not found: ${assetId}`);
    }
    return asset;
  }

  addProvenance(assetId: string, event: AssetProvenanceEvent): void {
    const events = this.provenance.get(assetId) ?? [];
    events.push(event);
    this.provenance.set(assetId, events);
  }

  listProvenance(assetId: string): AssetProvenanceEvent[] {
    return [...(this.provenance.get(assetId) ?? [])];
  }
}
