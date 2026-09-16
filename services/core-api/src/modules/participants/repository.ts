import type { ParticipantRecord } from "./types.js";

export class ParticipantRepository {
  private readonly participants = new Map<string, ParticipantRecord>();

  constructor(initialParticipants: ParticipantRecord[] = []) {
    for (const participant of initialParticipants) {
      this.save(participant);
    }
  }

  save(participant: ParticipantRecord): ParticipantRecord {
    this.participants.set(participant.participantId, participant);
    return participant;
  }

  list(): ParticipantRecord[] {
    return [...this.participants.values()];
  }

  get(participantId: string): ParticipantRecord | undefined {
    return this.participants.get(participantId);
  }

  require(participantId: string): ParticipantRecord {
    const participant = this.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }
    return participant;
  }
}
