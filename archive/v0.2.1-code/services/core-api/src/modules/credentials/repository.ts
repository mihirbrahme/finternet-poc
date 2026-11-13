import type { CredentialRecord } from "./types.js";

export class CredentialRepository {
  private readonly credentials = new Map<string, CredentialRecord>();

  save(credential: CredentialRecord): CredentialRecord {
    this.credentials.set(credential.credentialId, credential);
    return credential;
  }

  list(): CredentialRecord[] {
    return [...this.credentials.values()];
  }

  get(credentialId: string): CredentialRecord | undefined {
    return this.credentials.get(credentialId);
  }

  require(credentialId: string): CredentialRecord {
    const credential = this.get(credentialId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }
    return credential;
  }
}
