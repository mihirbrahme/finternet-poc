import type { AssetVerifiedAttestationRecord } from "./types.js";

export class AttestationRepository {
  private readonly attestations = new Map<string, AssetVerifiedAttestationRecord>();

  save(attestation: AssetVerifiedAttestationRecord): AssetVerifiedAttestationRecord {
    this.attestations.set(attestation.attestationId, attestation);
    return attestation;
  }

  list(): AssetVerifiedAttestationRecord[] {
    return [...this.attestations.values()];
  }

  get(attestationId: string): AssetVerifiedAttestationRecord | undefined {
    return this.attestations.get(attestationId);
  }
}
