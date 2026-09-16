import { generateDidWeb } from "./did.js";
import { ParticipantRepository } from "./repository.js";
import type {
  BindAccountInput,
  CreateParticipantInput,
  ParticipantRecord,
  ParticipantTrustView,
  SmartAccountBinding
} from "./types.js";

export class ParticipantService {
  constructor(private readonly repository = new ParticipantRepository()) {}

  createParticipant(input: CreateParticipantInput): ParticipantRecord {
    if (this.repository.get(input.participantId)) {
      throw new Error(`Participant already exists: ${input.participantId}`);
    }

    const participant: ParticipantRecord = {
      schemaVersion: "1.0",
      participantId: input.participantId,
      legalName: input.legalName,
      displayName: input.displayName,
      organisationType: input.organisationType,
      registrationReference: input.registrationReference,
      jurisdiction: input.jurisdiction,
      did: generateDidWeb(input.participantId),
      status: "ACTIVE",
      roles: input.roles ?? [input.organisationType],
      smartAccounts: [],
      credentialIds: [],
      dependencyMode: "LOCAL_MOCK",
      createdAt: input.createdAt ?? new Date().toISOString()
    };

    return this.repository.save(participant);
  }

  listParticipants(): ParticipantRecord[] {
    return this.repository.list();
  }

  getParticipant(participantId: string): ParticipantRecord | undefined {
    return this.repository.get(participantId);
  }

  createDid(participantId: string): string {
    const participant = this.repository.require(participantId);
    participant.did = generateDidWeb(participantId);
    this.repository.save(participant);
    return participant.did;
  }

  bindAccount(input: BindAccountInput): SmartAccountBinding {
    const participant = this.repository.require(input.participantId);
    const accountAddress = input.accountAddress.toLowerCase();

    const existingActiveAccount = this.repository
      .list()
      .flatMap((record) => record.smartAccounts)
      .find((account) => account.status === "ACTIVE" && account.accountAddress.toLowerCase() === accountAddress);

    if (existingActiveAccount) {
      throw new Error(`Account already bound: ${input.accountAddress}`);
    }

    const binding: SmartAccountBinding = {
      chainId: input.chainId,
      accountAddress: input.accountAddress,
      accountType: input.accountType ?? "CONTROLLED_TEST_WALLET",
      purpose: input.purpose ?? "PRIMARY_TRANSACTION_ACCOUNT",
      status: "ACTIVE"
    };

    participant.smartAccounts.push(binding);
    this.repository.save(participant);

    return binding;
  }

  addCredentialReference(participantId: string, credentialId: string): void {
    const participant = this.repository.require(participantId);
    if (!participant.credentialIds.includes(credentialId)) {
      participant.credentialIds.push(credentialId);
      this.repository.save(participant);
    }
  }

  setParticipantStatus(participantId: string, status: ParticipantRecord["status"]): ParticipantRecord {
    const participant = this.repository.require(participantId);
    participant.status = status;
    return this.repository.save(participant);
  }

  getTrustView(participantId: string): ParticipantTrustView {
    const participant = this.repository.require(participantId);
    return {
      participantId: participant.participantId,
      did: participant.did,
      status: participant.status,
      roles: participant.roles,
      activeAccounts: participant.smartAccounts.filter((account) => account.status === "ACTIVE"),
      credentialIds: participant.credentialIds,
      dependencyMode: participant.dependencyMode
    };
  }
}
