import { sha256CanonicalJson } from "../../shared/hash.js";
import type { CanonicalJsonValue } from "../../shared/canonicalJson.js";
import type { RecoveryAssetService } from "../assets/service.js";
import type { AttestationService } from "../attestations/service.js";
import type { CredentialService } from "../credentials/service.js";
import type { ParticipantService } from "../participants/service.js";
import type { TokenisationService } from "../tokenisation/service.js";
import { ClaimRepository } from "./repository.js";
import type { ClaimActionInput, ClaimRecord, CreateClaimInput } from "./types.js";

const OBP_READY_BOUNDARY =
  "OBP-ready recovery claim is evidence-backed for this PoC and is not official OBP credit issuance, an EPR certificate, or a government claim.";

export class ClaimService {
  private sequence = 1;

  constructor(
    private readonly participants: ParticipantService,
    private readonly credentials: CredentialService,
    private readonly assets: RecoveryAssetService,
    private readonly attestations: AttestationService,
    private readonly tokenisation: TokenisationService,
    private readonly repository = new ClaimRepository()
  ) {}

  createClaim(input: CreateClaimInput): ClaimRecord {
    if (input.quantity <= 0) {
      throw new Error("Claim quantity must be positive");
    }
    if (input.sourceAttestationIds.length === 0) {
      throw new Error("Claim requires at least one source attestation");
    }

    const asset = this.assets.requireAsset(input.assetId);
    const token = this.tokenisation.getTokenisedAssetByAssetId(input.assetId);
    if (!token || token.tokenId !== input.tokenId) {
      throw new Error(`Tokenised asset not found for claim: ${input.assetId}`);
    }

    this.requireActiveParticipant(input.issuerParticipantId);
    this.requireActiveParticipant(input.holderParticipantId);
    this.requireIssuerCredential(input.issuerParticipantId, input.createdAt);

    const sourceAttestations = input.sourceAttestationIds.map((attestationId) => {
      const attestation = this.attestations.getAttestation(attestationId);
      if (!attestation || attestation.status !== "ACTIVE") {
        throw new Error(`Source attestation is not active: ${attestationId}`);
      }
      if (attestation.assetId !== input.assetId) {
        throw new Error(`Source attestation does not match asset: ${attestationId}`);
      }
      return attestation;
    });

    const exclusive = input.exclusive ?? input.type === "OBP_READY_RECOVERY_CLAIM";
    if (input.type === "OBP_READY_RECOVERY_CLAIM") {
      if (input.claimBasis.isOfficialCredit !== false) {
        throw new Error("OBP-ready claims must have claimBasis.isOfficialCredit === false");
      }
      if (!exclusive) {
        throw new Error("OBP-ready claims must be exclusive in this PoC");
      }
      const eligibleQuantity = sourceAttestations
        .filter((attestation) => ["RECEIPT_CONFIRMED", "PROCESSING_CONFIRMED"].includes(attestation.type))
        .reduce((total, attestation) => total + attestation.quantity, 0);
      if (eligibleQuantity <= 0) {
        throw new Error("OBP-ready claim requires receipt or processing source attestation");
      }
      if (input.quantity > Math.min(asset.quantity.verified, eligibleQuantity)) {
        throw new Error("Claim quantity exceeds eligible source attestation quantity");
      }
      const activeExclusiveQuantity = this.repository
        .listByAsset(input.assetId)
        .filter((claim) => claim.type === input.type && claim.status === "ACTIVE" && claim.exclusive)
        .reduce((total, claim) => total + claim.quantity, 0);
      if (activeExclusiveQuantity + input.quantity > Math.min(asset.quantity.verified, eligibleQuantity)) {
        throw new Error("Claim conflict: active exclusive claim quantity would exceed eligible quantity");
      }
    }

    const now = input.createdAt ?? new Date().toISOString();
    const claimId = input.claimId ?? this.nextClaimId();
    if (this.repository.get(claimId)) {
      throw new Error(`Claim already exists: ${claimId}`);
    }

    const claim: ClaimRecord = {
      schemaVersion: "1.0",
      claimId,
      type: input.type,
      assetId: input.assetId,
      tokenId: input.tokenId,
      sourceAttestationIds: input.sourceAttestationIds,
      issuerParticipantId: input.issuerParticipantId,
      holderParticipantId: input.holderParticipantId,
      quantity: input.quantity,
      unit: input.unit,
      exclusive,
      claimBasis: {
        ...input.claimBasis,
        boundaryStatement:
          input.type === "OBP_READY_RECOVERY_CLAIM" ? OBP_READY_BOUNDARY : input.claimBasis.boundaryStatement
      },
      evidenceReferences: sourceAttestations.map((attestation) => ({
        evidenceManifestId: attestation.evidenceManifestId,
        evidenceHash: attestation.evidenceHash
      })),
      status: "ACTIVE",
      externalReference: input.externalReference ?? null,
      chain: {
        dependencyMode: "LOCAL_MOCK",
        txHash: this.claimTxHash(claimId, input.assetId, input.type, input.quantity, now)
      },
      createdAt: now,
      updatedAt: now
    };

    return this.repository.save(claim);
  }

  consumeClaim(input: ClaimActionInput): ClaimRecord {
    return this.closeClaim(input, "CONSUMED");
  }

  revokeClaim(input: ClaimActionInput): ClaimRecord {
    return this.closeClaim(input, "REVOKED");
  }

  disputeClaim(input: ClaimActionInput): ClaimRecord {
    return this.closeClaim(input, "DISPUTED");
  }

  getClaim(claimId: string): ClaimRecord {
    return this.repository.require(claimId);
  }

  listClaims(): ClaimRecord[] {
    return this.repository.list();
  }

  listClaimsByAsset(assetId: string): ClaimRecord[] {
    return this.repository.listByAsset(assetId);
  }

  private closeClaim(input: ClaimActionInput, status: ClaimRecord["status"]): ClaimRecord {
    const claim = this.repository.require(input.claimId);
    if (claim.status !== "ACTIVE") {
      throw new Error(`Claim is not active: ${input.claimId}`);
    }
    if (![claim.issuerParticipantId, claim.holderParticipantId].includes(input.actorParticipantId)) {
      throw new Error(`Participant cannot change claim status: ${input.actorParticipantId}`);
    }
    claim.status = status;
    claim.updatedAt = input.actedAt ?? new Date().toISOString();
    return this.repository.save(claim);
  }

  private requireActiveParticipant(participantId: string): void {
    const participant = this.participants.getParticipant(participantId);
    if (!participant || participant.status !== "ACTIVE") {
      throw new Error(`Participant is not active: ${participantId}`);
    }
  }

  private requireIssuerCredential(participantId: string, at?: string): void {
    const participant = this.participants.getParticipant(participantId);
    const valid = participant?.credentialIds
      .map((credentialId) =>
        this.credentials.verifyCredential({
          credentialId,
          requiredRole: "RECOVERY_ORIGINATOR",
          at
        })
      )
      .some((result) => result.valid);
    if (!valid) {
      throw new Error(`Issuer lacks active recovery originator credential: ${participantId}`);
    }
  }

  private claimTxHash(claimId: string, assetId: string, type: string, quantity: number, createdAt: string): string {
    return sha256CanonicalJson({
      kind: "CLAIM_CREATED",
      claimId,
      assetId,
      type,
      quantity,
      createdAt
    } as CanonicalJsonValue);
  }

  private nextClaimId(): string {
    return `CLM-${String(this.sequence++).padStart(6, "0")}`;
  }
}
