import type { DependencyMode } from "../../services/core-api/src/shared/dependencyModes.js";

export type BecknResourceAvailability = "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";

export interface BecknCatalogueResource {
  beckn: {
    providerId: string;
    resourceId: string;
    offerId: string;
    dependencyMode: DependencyMode;
  };
  assetId: string;
  tokenId: string;
  sellerParticipantId: string;
  material: {
    code: string;
    name: string;
  };
  quantity: {
    catalogueAvailable: number;
    unit: "kg";
  };
  ethereum: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  };
  origin: {
    country: "IN";
    state: "Maharashtra";
    district: "Raigad";
  };
  trust: {
    originatorDid: string;
    participantStatus: string;
    credentialIds: string[];
    verificationAttestationId: string;
    evidenceRoot: string;
  };
  terms: {
    unitPriceDinr: number;
    minimumQuantity: number;
    settlementDependencyMode: "NOT_CONNECTED";
    selectionStatus: "PLACEHOLDER_UNTIL_PACKET_7";
  };
  availability: BecknResourceAvailability;
}

export interface ProviderCatalogueSource {
  assetId: string;
  tokenId: string;
  sellerParticipantId: string;
  materialCode: string;
  materialName: string;
  verifiedQuantity: number;
  unit: "kg";
  chainId: number;
  contractAddress: string;
  metadataUri: string;
  evidenceRoot: string;
  verificationAttestationId: string;
  sellerDid: string;
  sellerStatus: string;
  credentialIds: string[];
  unitPriceDinr?: number;
  catalogueAvailableOverride?: number;
}
