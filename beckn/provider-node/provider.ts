import type { BecknCatalogueResource, ProviderCatalogueSource } from "./types.js";

export class BecknProviderNode {
  constructor(
    private readonly providerId: string,
    private readonly resources: ProviderCatalogueSource[] = []
  ) {}

  publishResource(source: ProviderCatalogueSource): BecknCatalogueResource {
    const resource = mapTokenisedAssetToBecknResource(this.providerId, source);
    const index = this.resources.findIndex((candidate) => candidate.assetId === source.assetId);
    if (index >= 0) {
      this.resources[index] = source;
    } else {
      this.resources.push(source);
    }
    return resource;
  }

  listCatalogue(): BecknCatalogueResource[] {
    return this.resources.map((resource) => mapTokenisedAssetToBecknResource(this.providerId, resource));
  }
}

export function mapTokenisedAssetToBecknResource(
  providerId: string,
  source: ProviderCatalogueSource
): BecknCatalogueResource {
  const catalogueAvailable = source.catalogueAvailableOverride ?? source.verifiedQuantity;

  return {
    beckn: {
      providerId,
      resourceId: `BECKN-${source.assetId}`,
      offerId: `OFFER-${source.assetId}`,
      dependencyMode: "SANDBOX_ADAPTER"
    },
    assetId: source.assetId,
    tokenId: source.tokenId,
    sellerParticipantId: source.sellerParticipantId,
    material: {
      code: source.materialCode,
      name: source.materialName
    },
    quantity: {
      catalogueAvailable,
      unit: source.unit
    },
    ethereum: {
      chainId: source.chainId,
      contractAddress: source.contractAddress,
      tokenId: source.tokenId
    },
    origin: {
      country: "IN",
      state: "Maharashtra",
      district: "Raigad"
    },
    trust: {
      originatorDid: source.sellerDid,
      participantStatus: source.sellerStatus,
      credentialIds: [...source.credentialIds],
      verificationAttestationId: source.verificationAttestationId,
      evidenceRoot: source.evidenceRoot
    },
    terms: {
      unitPriceDinr: source.unitPriceDinr ?? 20,
      minimumQuantity: 1,
      settlementDependencyMode: "NOT_CONNECTED",
      selectionStatus: "PLACEHOLDER_UNTIL_PACKET_7"
    },
    availability: catalogueAvailable > 0 ? "AVAILABLE" : "UNAVAILABLE"
  };
}

export * from "./types.js";
