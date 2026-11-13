import { canonicalJson, type CanonicalJsonValue } from "../../shared/canonicalJson.js";
import { sha256CanonicalJson, sha256Hex } from "../../shared/hash.js";
import { EvidenceRepository } from "./repository.js";
import type {
  CreateEvidenceInput,
  EvidenceItemRecord,
  EvidenceManifestPublicView,
  EvidenceManifestRecord,
  EvidencePublicReference
} from "./types.js";

export class EvidenceService {
  private evidenceSequence = 1;
  private manifestSequence = 1;

  constructor(private readonly repository = new EvidenceRepository()) {}

  hashContent(content: Buffer | string): string {
    return sha256Hex(content);
  }

  createEvidence(input: CreateEvidenceInput): EvidenceItemRecord {
    const evidenceId = input.evidenceId ?? this.nextEvidenceId();
    if (this.repository.getEvidence(evidenceId)) {
      throw new Error(`Evidence already exists: ${evidenceId}`);
    }

    const item: EvidenceItemRecord = {
      schemaVersion: "1.0",
      evidenceId,
      assetId: input.assetId,
      type: input.type,
      description: input.description,
      contentHashAlgorithm: "SHA-256",
      contentHash: this.hashContent(input.content),
      mimeType: input.mimeType,
      storageClass: input.storageClass ?? "PRIVATE_OBJECT_STORE",
      storageReference: input.storageReference,
      sourceParticipantId: input.sourceParticipantId,
      capturedAt: input.capturedAt ?? new Date().toISOString(),
      classification: input.classification
    };

    return this.repository.saveEvidence(item);
  }

  listEvidenceForAsset(assetId: string): EvidenceItemRecord[] {
    return this.repository.listEvidenceForAsset(assetId);
  }

  createManifest(assetId: string, input?: { manifestId?: string; createdAt?: string }): EvidenceManifestRecord {
    const evidence = this.listEvidenceForAsset(assetId).sort((left, right) =>
      left.evidenceId.localeCompare(right.evidenceId)
    );

    if (evidence.length === 0) {
      throw new Error(`Cannot create evidence manifest without evidence: ${assetId}`);
    }

    const manifestId = input?.manifestId ?? this.nextManifestId();
    const baseManifest = {
      schemaVersion: "1.0",
      manifestId,
      assetId,
      evidence,
      createdAt: input?.createdAt ?? new Date().toISOString(),
      manifestHashAlgorithm: "SHA-256-CANONICAL-JSON",
      dependencyMode: "LOCAL_MOCK"
    } as const;

    const manifestHash = sha256CanonicalJson(baseManifest as unknown as CanonicalJsonValue);
    const manifest: EvidenceManifestRecord = {
      ...baseManifest,
      manifestHash
    };

    return this.repository.saveManifest(manifest);
  }

  getManifest(manifestId: string): EvidenceManifestRecord | undefined {
    return this.repository.getManifest(manifestId);
  }

  requireManifest(manifestId: string): EvidenceManifestRecord {
    const manifest = this.repository.getManifest(manifestId);
    if (!manifest) {
      throw new Error(`Evidence manifest not found: ${manifestId}`);
    }
    return manifest;
  }

  toPublicManifestView(manifest: EvidenceManifestRecord): EvidenceManifestPublicView {
    return {
      schemaVersion: manifest.schemaVersion,
      manifestId: manifest.manifestId,
      assetId: manifest.assetId,
      evidence: manifest.evidence.map((item): EvidencePublicReference => ({
        evidenceId: item.evidenceId,
        type: item.type,
        contentHashAlgorithm: item.contentHashAlgorithm,
        contentHash: item.contentHash,
        mimeType: item.mimeType,
        classification: item.classification,
        publicAccess: item.classification === "PUBLIC_SAFE" ? "PUBLIC_METADATA" : "HASH_ONLY"
      })),
      createdAt: manifest.createdAt,
      manifestHashAlgorithm: manifest.manifestHashAlgorithm,
      manifestHash: manifest.manifestHash,
      dependencyMode: manifest.dependencyMode
    };
  }

  serializeManifest(manifest: EvidenceManifestRecord | EvidenceManifestPublicView): string {
    return canonicalJson(manifest as unknown as CanonicalJsonValue);
  }

  private nextEvidenceId(): string {
    return `EVD-${String(this.evidenceSequence++).padStart(6, "0")}`;
  }

  private nextManifestId(): string {
    return `EVM-${String(this.manifestSequence++).padStart(6, "0")}`;
  }
}

export { sha256Hex as computeSha256ContentHash, sha256CanonicalJson as computeCanonicalJsonHash };
