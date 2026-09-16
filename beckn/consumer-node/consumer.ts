import type { InMemoryBlockchainIndexer } from "../../services/blockchain-indexer/index.js";
import type { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import type { ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { BecknDiscoverySandbox, DiscoveryIntent } from "../discovery-sandbox/index.js";
import type { VerifiedDiscoveryResource } from "./types.js";

export class BecknConsumerNode {
  constructor(
    private readonly discovery: BecknDiscoverySandbox,
    private readonly participants: ParticipantService,
    private readonly credentials: CredentialService,
    private readonly indexer: InMemoryBlockchainIndexer,
    private readonly verificationTime?: string
  ) {}

  search(intent: DiscoveryIntent): VerifiedDiscoveryResource[] {
    return this.discovery.discover(intent).resources.map((resource) => this.verifyResource(resource));
  }

  verifyResource(resource: VerifiedDiscoveryResource["resource"]): VerifiedDiscoveryResource {
    const trust = this.participants.getTrustView(resource.sellerParticipantId);
    const tokenState = this.indexer.getToken(resource.tokenId);
    if (!tokenState) {
      throw new Error(`Indexed token state not found for token: ${resource.tokenId}`);
    }

    const holderBalance = tokenState.balances[resource.sellerParticipantId] ?? 0;
    const lockedBalance = tokenState.lockedBalances[resource.sellerParticipantId] ?? 0;
    const liveAvailableQuantity = Math.max(holderBalance - lockedBalance, 0);
    const selectableQuantity = Math.min(resource.quantity.catalogueAvailable, liveAvailableQuantity);
    const credentialChecks = resource.trust.credentialIds.map((credentialId) =>
      this.credentials.verifyCredential({
        credentialId,
        requiredRole: "RECOVERY_ORIGINATOR",
        at: this.verificationTime
      })
    );
    const hasValidOriginatorCredential = credentialChecks.some((result) => result.valid);

    return {
      resource,
      tokenState,
      verification: {
        sellerTrusted:
          trust.status === "ACTIVE" &&
          trust.did === resource.trust.originatorDid &&
          resource.trust.credentialIds.every((credentialId) => trust.credentialIds.includes(credentialId)) &&
          hasValidOriginatorCredential,
        tokenExists: tokenState.assetId === resource.assetId,
        evidenceRootMatches: tokenState.evidenceRoot === resource.trust.evidenceRoot,
        liveAvailableQuantity,
        selectableQuantity,
        selectionEnabled: false,
        selectionDisabledReason: "SETTLEMENT_PACKET_7_NOT_AVAILABLE",
        staleCatalogueCapped: selectableQuantity < resource.quantity.catalogueAvailable
      }
    };
  }
}

export * from "./types.js";
