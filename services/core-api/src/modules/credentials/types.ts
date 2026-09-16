import type { DependencyMode } from "../../shared/dependencyModes.js";
import type { ParticipantRole } from "../participants/types.js";

export type CredentialStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED";

export interface CredentialRecord {
  credentialId: string;
  type: "OrganisationCredential" | "NetworkParticipantCredential" | "RecoveryOriginatorCredential" | "ProcessorCredential" | "VerifierCredential" | "SponsorCredential" | "AgentDelegationCredential";
  issuerDid: string;
  subjectDid: string;
  participantId: string;
  roles: ParticipantRole[];
  materialClasses: string[];
  ethereumAccounts: string[];
  validFrom: string;
  validUntil: string;
  status: CredentialStatus;
  dependencyMode: DependencyMode;
  proofMode: "DEMO_ISSUER_UNSIGNED" | "VC_PROOF_SUITE";
  issuedAt: string;
  revokedAt?: string;
}

export interface IssueCredentialInput {
  credentialId: string;
  participantId: string;
  type: CredentialRecord["type"];
  roles: ParticipantRole[];
  materialClasses?: string[];
  ethereumAccounts?: string[];
  validFrom?: string;
  validUntil: string;
}

export interface VerifyCredentialInput {
  credentialId: string;
  requiredRole?: ParticipantRole;
  accountAddress?: string;
  at?: string;
}

export interface CredentialVerificationResult {
  valid: boolean;
  reason: string;
  credential?: CredentialRecord;
}
