import type { BecknCatalogueResource } from "../provider-node/index.js";

export interface DiscoveryIntent {
  materialCode?: string;
  state?: "Maharashtra";
  district?: "Raigad";
  minQuantity?: number;
  maxQuantity?: number;
  requireVerifiedCredential?: boolean;
}

export interface DiscoveryResult {
  intent: DiscoveryIntent;
  resources: BecknCatalogueResource[];
  dependencyMode: "SANDBOX_ADAPTER";
}
