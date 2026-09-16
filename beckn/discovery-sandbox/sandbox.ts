import type { BecknProviderNode } from "../provider-node/index.js";
import type { BecknCatalogueResource } from "../provider-node/types.js";
import type { DiscoveryIntent, DiscoveryResult } from "./types.js";

export class BecknDiscoverySandbox {
  private readonly providers: BecknProviderNode[] = [];

  registerProvider(provider: BecknProviderNode): void {
    this.providers.push(provider);
  }

  discover(intent: DiscoveryIntent): DiscoveryResult {
    const resources = this.providers
      .flatMap((provider) => provider.listCatalogue())
      .filter((resource) => matchesIntent(resource, intent))
      .sort((left, right) => left.assetId.localeCompare(right.assetId));

    return {
      intent,
      resources,
      dependencyMode: "SANDBOX_ADAPTER"
    };
  }
}

function matchesIntent(resource: BecknCatalogueResource, intent: DiscoveryIntent): boolean {
  if (intent.materialCode && resource.material.code !== intent.materialCode) {
    return false;
  }
  if (intent.state && resource.origin.state !== intent.state) {
    return false;
  }
  if (intent.district && resource.origin.district !== intent.district) {
    return false;
  }
  if (intent.minQuantity && resource.quantity.catalogueAvailable < intent.minQuantity) {
    return false;
  }
  if (intent.maxQuantity && resource.quantity.catalogueAvailable > intent.maxQuantity) {
    return false;
  }
  if (intent.requireVerifiedCredential && resource.trust.credentialIds.length === 0) {
    return false;
  }
  return resource.availability !== "UNAVAILABLE";
}

export * from "./types.js";
