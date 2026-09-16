import { identityDependencyModes } from "../../shared/dependencyModes.js";
import type { ParticipantService } from "../participants/service.js";
import { CredentialRepository } from "./repository.js";
import type {
  CredentialRecord,
  CredentialVerificationResult,
  IssueCredentialInput,
  VerifyCredentialInput
} from "./types.js";

const DEMO_ISSUER_DID = "did:web:finternet-poc.local:issuer";

export class CredentialService {
  constructor(
    private readonly participants: ParticipantService,
    private readonly repository = new CredentialRepository()
  ) {}

  issueCredential(input: IssueCredentialInput): CredentialRecord {
    if (this.repository.get(input.credentialId)) {
      throw new Error(`Credential already exists: ${input.credentialId}`);
    }

    const participant = this.participants.getParticipant(input.participantId);
    if (!participant) {
      throw new Error(`Cannot issue credential for unknown participant: ${input.participantId}`);
    }

    const now = new Date().toISOString();
    const credential: CredentialRecord = {
      credentialId: input.credentialId,
      type: input.type,
      issuerDid: DEMO_ISSUER_DID,
      subjectDid: participant.did,
      participantId: participant.participantId,
      roles: input.roles,
      materialClasses: input.materialClasses ?? [],
      ethereumAccounts: input.ethereumAccounts ?? participant.smartAccounts.map((account) => account.accountAddress),
      validFrom: input.validFrom ?? now,
      validUntil: input.validUntil,
      status: "ACTIVE",
      dependencyMode: identityDependencyModes.vcIssuer,
      proofMode: "DEMO_ISSUER_UNSIGNED",
      issuedAt: now
    };

    this.repository.save(credential);
    this.participants.addCredentialReference(participant.participantId, credential.credentialId);
    return credential;
  }

  listCredentials(): CredentialRecord[] {
    return this.repository.list();
  }

  getCredential(credentialId: string): CredentialRecord | undefined {
    return this.repository.get(credentialId);
  }

  verifyCredential(input: VerifyCredentialInput): CredentialVerificationResult {
    const credential = this.repository.get(input.credentialId);
    if (!credential) {
      return { valid: false, reason: "CREDENTIAL_NOT_FOUND" };
    }

    const participant = this.participants.getParticipant(credential.participantId);
    if (!participant || participant.status !== "ACTIVE") {
      return { valid: false, reason: "PARTICIPANT_NOT_ACTIVE", credential };
    }

    if (credential.status !== "ACTIVE") {
      return { valid: false, reason: `CREDENTIAL_${credential.status}`, credential };
    }

    const checkedAt = new Date(input.at ?? new Date().toISOString()).getTime();
    if (checkedAt < new Date(credential.validFrom).getTime()) {
      return { valid: false, reason: "CREDENTIAL_NOT_YET_VALID", credential };
    }
    if (checkedAt > new Date(credential.validUntil).getTime()) {
      return { valid: false, reason: "CREDENTIAL_EXPIRED", credential };
    }

    if (input.requiredRole && !credential.roles.includes(input.requiredRole)) {
      return { valid: false, reason: "ROLE_NOT_GRANTED", credential };
    }

    if (
      input.accountAddress &&
      !credential.ethereumAccounts.map((account) => account.toLowerCase()).includes(input.accountAddress.toLowerCase())
    ) {
      return { valid: false, reason: "ACCOUNT_NOT_BOUND_TO_CREDENTIAL", credential };
    }

    return { valid: true, reason: "VALID", credential };
  }

  revokeCredential(credentialId: string, revokedAt = new Date().toISOString()): CredentialRecord {
    const credential = this.repository.require(credentialId);
    credential.status = "REVOKED";
    credential.revokedAt = revokedAt;
    return this.repository.save(credential);
  }
}
