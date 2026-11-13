import type { ExplorerTokenReadModel } from "../../services/blockchain-indexer/index.js";
import type { BecknCatalogueResource } from "../provider-node/index.js";

export interface VerifiedDiscoveryResource {
  resource: BecknCatalogueResource;
  tokenState: ExplorerTokenReadModel;
  verification: {
    sellerTrusted: boolean;
    tokenExists: boolean;
    evidenceRootMatches: boolean;
    liveAvailableQuantity: number;
    selectableQuantity: number;
    selectionEnabled: false;
    selectionDisabledReason: "SETTLEMENT_PACKET_7_NOT_AVAILABLE";
    staleCatalogueCapped: boolean;
  };
}
