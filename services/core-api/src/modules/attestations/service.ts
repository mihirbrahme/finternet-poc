import type { CredentialService } from "../credentials/service.js";
import type { ParticipantService } from "../participants/service.js";
import { AttestationRepository } from "./repository.js";
import type { AssetVerifiedAttestationRecord, CreateAssetVerifiedAttestationInput } from "./types.js";

export class AttestationService {
  private sequence = 1;

  constructor(
    private readonly participants: ParticipantService,
    private readonly credentials: CredentialService,
    private readonly repository = new AttestationRepository()
  ) {}

  createAssetVerifiedAttestation(input: CreateAssetVerifiedAttestationInput): AssetVerifiedAttestationRecord {
    const participant = this.participants.getParticipant(input.attestorParticipantId);
    if (!participant || participant.status !== "ACTIVE") {
      throw new Error(`Attestor participant is not active: ${input.attestorParticipantId}`);
    }

    if (!participant.roles.includes("VERIFIER")) {
      throw new Error(`Participant is not a verifier: ${input.attestorParticipantId}`);
    }

    const credentialId = input.credentialId ?? this.findVerifierCredential(input.attestorParticipantId);
    const verification = this.credentials.verifyCredential({
      credentialId,
      requiredRole: "VERIFIER",
      accountAddress: input.attestorAccount,
      at: input.eventTime
    });

    if (!verification.valid) {
      throw new Error(`Verifier credential invalid: ${verification.reason}`);
    }

    const eventTime = input.eventTime ?? new Date().toISOString();
    const attestation: AssetVerifiedAttestationRecord = {
      schemaVersion: "1.0",
      attestationId: this.nextAttestationId(),
      type: "ASSET_VERIFIED",
      assetId: input.assetId,
      attestorParticipantId: participant.participantId,
      attestorDid: participant.did,
      attestorAccount: input.attestorAccount,
      quantity: input.quantity,
      unit: input.unit,
      eventTime,
      evidenceManifestId: input.evidenceManifestId,
      evidenceHash: input.evidenceHash,
      credentialId,
      signatureMode: "DEMO_UNSIGNED_ATTESTATION",
      status: "ACTIVE",
      chain: {
        dependencyMode: "NOT_CONNECTED"
      }
    };

    return this.repository.save(attestation);
  }

  listAttestations(): AssetVerifiedAttestationRecord[] {
    return this.repository.list();
  }

  getAttestation(attestationId: string): AssetVerifiedAttestationRecord | undefined {
    return this.repository.get(attestationId);
  }

  private findVerifierCredential(participantId: string): string {
    const credential = this.credentials
      .listCredentials()
      .find((candidate) => candidate.participantId === participantId && candidate.roles.includes("VERIFIER"));

    if (!credential) {
      throw new Error(`No verifier credential found for participant: ${participantId}`);
    }

    return credential.credentialId;
  }

  private nextAttestationId(): string {
    return `ATT-${String(this.sequence++).padStart(6, "0")}`;
  }
}
