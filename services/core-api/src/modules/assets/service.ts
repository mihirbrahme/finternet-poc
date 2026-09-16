import type { ParticipantService } from "../participants/service.js";
import type { AttestationService } from "../attestations/service.js";
import type { EvidenceService } from "../evidence/service.js";
import type { EvidenceManifestRecord } from "../evidence/types.js";
import { RecoveryAssetRepository } from "./repository.js";
import type {
  AssetProvenanceEvent,
  AssetPublicMetadata,
  CreateRecoveryAssetInput,
  RecoveryAssetRecord
} from "./types.js";

export interface VerifyAssetInput {
  assetId: string;
  verifierParticipantId: string;
  verifierAccount: string;
  credentialId?: string;
  eventTime?: string;
}

export class RecoveryAssetService {
  private sequence = 1;

  constructor(
    private readonly participants: ParticipantService,
    private readonly evidence: EvidenceService,
    private readonly attestations: AttestationService,
    private readonly repository = new RecoveryAssetRepository()
  ) {}

  createAsset(input: CreateRecoveryAssetInput): RecoveryAssetRecord {
    const originator = this.participants.getParticipant(input.originatorParticipantId);
    if (!originator || originator.status !== "ACTIVE") {
      throw new Error(`Originator participant is not active: ${input.originatorParticipantId}`);
    }

    const now = input.createdAt ?? new Date().toISOString();
    const asset: RecoveryAssetRecord = {
      schemaVersion: "1.0",
      assetId: input.assetId ?? this.nextAssetId(now),
      originatorParticipantId: input.originatorParticipantId,
      materialCode: input.materialCode,
      quantity: {
        estimated: input.estimatedQuantity,
        verified: input.verifiedQuantity ?? input.estimatedQuantity,
        unit: "kg"
      },
      origin: {
        country: "IN",
        state: "Maharashtra",
        district: "Raigad",
        locationReference: input.locationReference
      },
      collectionContext: {
        villageOrRoute: input.villageOrRoute,
        collectionType: input.collectionType,
        obpRiskContext: input.obpRiskContext ?? "NOT_ASSESSED"
      },
      quality: {
        grade: input.qualityGrade ?? "SORTED",
        contaminationPercent: input.contaminationPercent ?? 0
      },
      custody: {
        currentParticipantId: input.originatorParticipantId,
        facilityReference: input.facilityReference
      },
      verificationStatus: "DRAFT",
      lifecycleStatus: "CREATED",
      evidenceManifestId: "EVM-000000",
      createdAt: now,
      updatedAt: now
    };

    if (this.repository.get(asset.assetId)) {
      throw new Error(`Recovery asset already exists: ${asset.assetId}`);
    }

    this.repository.save(asset);
    this.addProvenance(asset.assetId, {
      eventType: "ASSET_CREATED",
      at: now,
      actorParticipantId: input.originatorParticipantId,
      referenceId: asset.assetId,
      summary: `Aamhi recovery lot created for ${asset.quantity.estimated} kg ${asset.materialCode} in Raigad`
    });

    return asset;
  }

  listAssets(): RecoveryAssetRecord[] {
    return this.repository.list();
  }

  getAsset(assetId: string): RecoveryAssetRecord | undefined {
    return this.repository.get(assetId);
  }

  requireAsset(assetId: string): RecoveryAssetRecord {
    return this.repository.require(assetId);
  }

  attachEvidenceManifest(assetId: string, input?: { manifestId?: string; createdAt?: string }): EvidenceManifestRecord {
    const asset = this.repository.require(assetId);
    const manifest = this.evidence.createManifest(assetId, input);
    asset.evidenceManifestId = manifest.manifestId;
    asset.evidenceRoot = manifest.manifestHash;
    asset.verificationStatus = "EVIDENCE_SUBMITTED";
    asset.updatedAt = manifest.createdAt;
    this.repository.save(asset);
    this.addProvenance(assetId, {
      eventType: "EVIDENCE_MANIFEST_CREATED",
      at: manifest.createdAt,
      actorParticipantId: asset.originatorParticipantId,
      referenceId: manifest.manifestId,
      summary: "Evidence manifest created with private evidence represented by hashes"
    });
    return manifest;
  }

  verifyAsset(input: VerifyAssetInput): RecoveryAssetRecord {
    const asset = this.repository.require(input.assetId);
    if (!asset.evidenceRoot || asset.evidenceManifestId === "EVM-000000") {
      throw new Error(`Asset has no evidence manifest: ${asset.assetId}`);
    }

    const attestation = this.attestations.createAssetVerifiedAttestation({
      assetId: asset.assetId,
      attestorParticipantId: input.verifierParticipantId,
      attestorAccount: input.verifierAccount,
      quantity: asset.quantity.verified,
      unit: asset.quantity.unit,
      eventTime: input.eventTime,
      evidenceManifestId: asset.evidenceManifestId,
      evidenceHash: asset.evidenceRoot,
      credentialId: input.credentialId
    });

    asset.verificationStatus = "VERIFIED";
    asset.lifecycleStatus = "VERIFIED";
    asset.verificationAttestationId = attestation.attestationId;
    asset.updatedAt = attestation.eventTime;
    this.repository.save(asset);
    this.addProvenance(asset.assetId, {
      eventType: "ASSET_VERIFIED",
      at: attestation.eventTime,
      actorParticipantId: input.verifierParticipantId,
      referenceId: attestation.attestationId,
      summary: "Verifier attested the recovery asset evidence package"
    });

    return asset;
  }

  getProvenance(assetId: string): AssetProvenanceEvent[] {
    this.repository.require(assetId);
    return this.repository.listProvenance(assetId);
  }

  toPublicMetadata(assetId: string): AssetPublicMetadata {
    const asset = this.repository.require(assetId);
    const manifest = asset.evidenceManifestId !== "EVM-000000" ? this.evidence.getManifest(asset.evidenceManifestId) : undefined;

    return {
      schemaVersion: "1.0",
      assetId: asset.assetId,
      materialCode: asset.materialCode,
      quantity: asset.quantity,
      origin: asset.origin,
      collectionContext: asset.collectionContext,
      originatorParticipantId: asset.originatorParticipantId,
      verification: {
        status: asset.verificationStatus,
        evidenceRoot: asset.evidenceRoot,
        attestationId: asset.verificationAttestationId
      },
      evidenceManifest: manifest ? this.evidence.toPublicManifestView(manifest) : undefined
    };
  }

  private addProvenance(assetId: string, event: AssetProvenanceEvent): void {
    this.repository.addProvenance(assetId, event);
  }

  private nextAssetId(createdAt: string): string {
    const year = new Date(createdAt).getUTCFullYear();
    return `RWA-RAI-${year}-${String(this.sequence++).padStart(6, "0")}`;
  }
}
