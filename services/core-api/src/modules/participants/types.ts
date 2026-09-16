import type { DependencyMode } from "../../shared/dependencyModes.js";

export type ParticipantRole =
  | "NETWORK_ADMIN"
  | "RECOVERY_ORIGINATOR"
  | "BUYER"
  | "PROCESSOR"
  | "VERIFIER"
  | "SPONSOR"
  | "AI_AGENT_SERVICE";

export type ParticipantStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type AccountStatus = "ACTIVE" | "INACTIVE" | "REVOKED";

export type AccountType = "CONTROLLED_TEST_WALLET" | "ERC4337_SMART_ACCOUNT";

export interface SmartAccountBinding {
  chainId: number;
  accountAddress: string;
  accountType: AccountType;
  purpose: "PRIMARY_TRANSACTION_ACCOUNT" | "ATTESTATION_ACCOUNT" | "SERVICE_ACCOUNT";
  status: AccountStatus;
}

export interface ParticipantRecord {
  schemaVersion: "1.0";
  participantId: string;
  legalName: string;
  displayName: string;
  organisationType: ParticipantRole;
  registrationReference?: string;
  jurisdiction: string;
  did: string;
  status: ParticipantStatus;
  roles: ParticipantRole[];
  smartAccounts: SmartAccountBinding[];
  credentialIds: string[];
  dependencyMode: DependencyMode;
  createdAt: string;
}

export interface CreateParticipantInput {
  participantId: string;
  legalName: string;
  displayName: string;
  organisationType: ParticipantRole;
  registrationReference?: string;
  jurisdiction: string;
  roles?: ParticipantRole[];
  createdAt?: string;
}

export interface BindAccountInput {
  participantId: string;
  chainId: number;
  accountAddress: string;
  accountType?: AccountType;
  purpose?: SmartAccountBinding["purpose"];
}

export interface ParticipantTrustView {
  participantId: string;
  did: string;
  status: ParticipantStatus;
  roles: ParticipantRole[];
  activeAccounts: SmartAccountBinding[];
  credentialIds: string[];
  dependencyMode: DependencyMode;
}
