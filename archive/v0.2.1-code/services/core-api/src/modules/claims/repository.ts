import type { ClaimRecord } from "./types.js";

export class ClaimRepository {
  private readonly claims = new Map<string, ClaimRecord>();

  save(claim: ClaimRecord): ClaimRecord {
    this.claims.set(claim.claimId, claim);
    return claim;
  }

  get(claimId: string): ClaimRecord | undefined {
    return this.claims.get(claimId);
  }

  require(claimId: string): ClaimRecord {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim not found: ${claimId}`);
    }
    return claim;
  }

  list(): ClaimRecord[] {
    return [...this.claims.values()];
  }

  listByAsset(assetId: string): ClaimRecord[] {
    return this.list().filter((claim) => claim.assetId === assetId);
  }
}
