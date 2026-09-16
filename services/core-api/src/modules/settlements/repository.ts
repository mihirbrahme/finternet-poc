import type { SettlementRecord } from "./types.js";

export class SettlementRepository {
  private readonly recordsById = new Map<string, SettlementRecord>();

  save(record: SettlementRecord): SettlementRecord {
    this.recordsById.set(record.settlementId, record);
    return record;
  }

  get(settlementId: string): SettlementRecord | undefined {
    return this.recordsById.get(settlementId);
  }

  require(settlementId: string): SettlementRecord {
    const record = this.recordsById.get(settlementId);
    if (!record) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    return record;
  }

  list(): SettlementRecord[] {
    return [...this.recordsById.values()];
  }
}
