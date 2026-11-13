import type { AttestationRecord } from "./types.js";

export class AttestationRepository {
  private readonly attestations = new Map<string, AttestationRecord>();

  save<T extends AttestationRecord>(attestation: T): T {
    this.attestations.set(attestation.attestationId, attestation);
    return attestation;
  }

  list(): AttestationRecord[] {
    return [...this.attestations.values()];
  }

  get(attestationId: string): AttestationRecord | undefined {
    return this.attestations.get(attestationId);
  }
}
