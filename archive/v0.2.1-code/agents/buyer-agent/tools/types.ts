import type { BecknConsumerNode } from "../../../beckn/consumer-node/index.js";
import type { InMemoryBlockchainIndexer } from "../../../services/blockchain-indexer/index.js";
import type { RecoveryAssetService } from "../../../services/core-api/src/modules/assets/index.js";
import type { CredentialService } from "../../../services/core-api/src/modules/credentials/index.js";
import type { ParticipantService } from "../../../services/core-api/src/modules/participants/index.js";
import type { SettlementService } from "../../../services/core-api/src/modules/settlements/index.js";

export interface LocalBuyerAgentToolContext {
  consumer: BecknConsumerNode;
  indexer: InMemoryBlockchainIndexer;
  services: {
    participantService: ParticipantService;
    credentialService: CredentialService;
    assetService: RecoveryAssetService;
    settlementService: SettlementService;
  };
}
