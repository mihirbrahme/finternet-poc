import type { EvidenceItemRecord, EvidenceManifestRecord } from "./types.js";

export class EvidenceRepository {
  private readonly evidence = new Map<string, EvidenceItemRecord>();
  private readonly manifests = new Map<string, EvidenceManifestRecord>();

  saveEvidence(item: EvidenceItemRecord): EvidenceItemRecord {
    this.evidence.set(item.evidenceId, item);
    return item;
  }

  listEvidenceForAsset(assetId: string): EvidenceItemRecord[] {
    return [...this.evidence.values()].filter((item) => item.assetId === assetId);
  }

  getEvidence(evidenceId: string): EvidenceItemRecord | undefined {
    return this.evidence.get(evidenceId);
  }

  saveManifest(manifest: EvidenceManifestRecord): EvidenceManifestRecord {
    this.manifests.set(manifest.manifestId, manifest);
    return manifest;
  }

  getManifest(manifestId: string): EvidenceManifestRecord | undefined {
    return this.manifests.get(manifestId);
  }
}
