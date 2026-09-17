import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BecknConsumerNode } from "../../beckn/consumer-node/index.js";
import { BecknDiscoverySandbox } from "../../beckn/discovery-sandbox/index.js";
import { BecknProviderNode } from "../../beckn/provider-node/index.js";
import { InMemoryBlockchainIndexer } from "../../services/blockchain-indexer/index.js";
import { RecoveryAssetService } from "../../services/core-api/src/modules/assets/index.js";
import { AttestationService } from "../../services/core-api/src/modules/attestations/index.js";
import { ClaimService } from "../../services/core-api/src/modules/claims/index.js";
import { CredentialService } from "../../services/core-api/src/modules/credentials/index.js";
import { EvidenceService } from "../../services/core-api/src/modules/evidence/index.js";
import { ParticipantService } from "../../services/core-api/src/modules/participants/index.js";
import type { ParticipantRecord } from "../../services/core-api/src/modules/participants/index.js";
import { SettlementService } from "../../services/core-api/src/modules/settlements/index.js";
import type { SettlementRecord } from "../../services/core-api/src/modules/settlements/index.js";
import { TokenisationService } from "../../services/core-api/src/modules/tokenisation/index.js";
import type { TokeniseAssetResult } from "../../services/core-api/src/modules/tokenisation/index.js";

export const demoIds = {
  networkAdmin: "ORG-SUMA-001",
  seller: "ORG-AAMHI-001",
  buyer: "ORG-BUYER-001",
  processor: "ORG-PROCESSOR-001",
  verifier: "ORG-VERIFIER-001",
  agent: "ORG-AGENT-001",
  asset: "RWA-RAI-2026-000001",
  settlement: "STL-000001",
  claim: "CLM-000001",
  contract: "CTR-000123"
} as const;

export const demoAccounts = {
  networkAdmin: "0x1111111111111111111111111111111111111111",
  seller: "0x2222222222222222222222222222222222222222",
  buyer: "0x3333333333333333333333333333333333333333",
  processor: "0x4444444444444444444444444444444444444444",
  verifier: "0x5555555555555555555555555555555555555555",
  agent: "0x6666666666666666666666666666666666666666"
} as const;

export interface DemoServices {
  participantService: ParticipantService;
  credentialService: CredentialService;
  evidenceService: EvidenceService;
  attestationService: AttestationService;
  assetService: RecoveryAssetService;
  tokenisationService: TokenisationService;
  settlementService: SettlementService;
  claimService: ClaimService;
}

export interface TokenisedDemoAsset {
  asset: ReturnType<RecoveryAssetService["requireAsset"]>;
  manifest: ReturnType<EvidenceService["requireManifest"]>;
  tokenised: TokeniseAssetResult;
}

export interface PublishedDemoCatalogue {
  provider: BecknProviderNode;
  discovery: BecknDiscoverySandbox;
  consumer: BecknConsumerNode;
  catalogueResource: ReturnType<BecknProviderNode["publishResource"]>;
  discoveryResults: ReturnType<BecknConsumerNode["search"]>;
}

export interface AamhiDemoState {
  services: DemoServices;
  indexer: InMemoryBlockchainIndexer;
  tokenisedAsset: TokenisedDemoAsset;
  catalogue: PublishedDemoCatalogue;
  selectedResource: PublishedDemoCatalogue["discoveryResults"][number];
  settlement: SettlementRecord;
  receiptAttestation: ReturnType<AttestationService["createOperationalAttestation"]>;
  settled: SettlementRecord;
  claim: ReturnType<ClaimService["createClaim"]>;
  explorerAsset: ReturnType<InMemoryBlockchainIndexer["getAsset"]>;
}

export function createDemoServices(): DemoServices {
  const participantService = new ParticipantService();
  seedParticipants(participantService);

  const credentialService = new CredentialService(participantService);
  issueDemoCredentials(credentialService);

  const evidenceService = new EvidenceService();
  const attestationService = new AttestationService(participantService, credentialService);
  const assetService = new RecoveryAssetService(participantService, evidenceService, attestationService);
  const tokenisationService = new TokenisationService(assetService, credentialService);
  const settlementService = new SettlementService(participantService, credentialService, tokenisationService);
  const claimService = new ClaimService(
    participantService,
    credentialService,
    assetService,
    attestationService,
    tokenisationService
  );

  return {
    participantService,
    credentialService,
    evidenceService,
    attestationService,
    assetService,
    tokenisationService,
    settlementService,
    claimService
  };
}

export function buildTokenisedAamhiAsset(services: DemoServices): TokenisedDemoAsset {
  const sample = readSampleAsset();
  const asset = services.assetService.createAsset({
    assetId: sample.assetId,
    originatorParticipantId: sample.originatorParticipantId,
    materialCode: sample.materialCode,
    estimatedQuantity: sample.quantity.estimated,
    verifiedQuantity: sample.quantity.verified,
    villageOrRoute: sample.collectionContext.villageOrRoute,
    collectionType: sample.collectionContext.collectionType,
    obpRiskContext: sample.collectionContext.obpRiskContext,
    locationReference: sample.origin.locationReference,
    qualityGrade: sample.quality.grade,
    contaminationPercent: sample.quality.contaminationPercent,
    facilityReference: sample.custody.facilityReference,
    createdAt: sample.createdAt
  });

  services.evidenceService.createEvidence({
    evidenceId: "EVD-000001",
    assetId: asset.assetId,
    type: "COLLECTION_PHOTO",
    content: "photo bytes for Nandgaon coastal route LDPE recovery lot",
    mimeType: "image/jpeg",
    storageReference: "s3://private/aamhi-demo/EVD-000001.jpg",
    sourceParticipantId: demoIds.seller,
    classification: "CONFIDENTIAL",
    capturedAt: "2026-10-01T09:30:00Z"
  });
  services.evidenceService.createEvidence({
    evidenceId: "EVD-000002",
    assetId: asset.assetId,
    type: "WEIGHMENT_SLIP",
    content: "weighment slip 1000kg ldpe lot",
    mimeType: "application/pdf",
    storageReference: "s3://private/aamhi-demo/EVD-000002.pdf",
    sourceParticipantId: demoIds.seller,
    classification: "RESTRICTED",
    capturedAt: "2026-10-01T10:00:00Z"
  });
  services.evidenceService.createEvidence({
    evidenceId: "EVD-000003",
    assetId: asset.assetId,
    type: "PROCESSOR_RECEIPT",
    content: "processor receipt for 500kg accepted material",
    mimeType: "application/pdf",
    storageReference: "s3://private/aamhi-demo/EVD-000003.pdf",
    sourceParticipantId: demoIds.processor,
    classification: "RESTRICTED",
    capturedAt: "2026-10-01T15:00:00Z"
  });

  const manifest = services.assetService.attachEvidenceManifest(asset.assetId, {
    manifestId: "EVM-000001",
    createdAt: "2026-10-01T10:15:00Z"
  });
  const verified = services.assetService.verifyAsset({
    assetId: asset.assetId,
    verifierParticipantId: demoIds.verifier,
    verifierAccount: demoAccounts.verifier,
    credentialId: "VC-VERIFIER-000001",
    eventTime: "2026-10-01T11:00:00Z"
  });
  const tokenised = services.tokenisationService.tokeniseAsset({
    assetId: verified.assetId,
    tokeniserParticipantId: demoIds.networkAdmin,
    tokeniserAccount: demoAccounts.networkAdmin,
    tokeniserCredentialId: "VC-NETWORK-ADMIN-000001",
    submittedAt: "2026-10-01T12:00:00Z"
  });

  return {
    asset: verified,
    manifest,
    tokenised
  };
}

export function indexMint(indexer: InMemoryBlockchainIndexer, tokenised: TokeniseAssetResult): void {
  indexer.index({
    type: "AssetMinted",
    txHash: tokenised.mintTransaction.txHash,
    blockNumber: 1,
    assetId: tokenised.token.assetId,
    tokenId: tokenised.token.tokenId,
    to: demoIds.seller,
    quantity: tokenised.token.totalSupply,
    metadataUri: tokenised.token.metadataUri,
    evidenceRoot: tokenised.token.evidenceRoot
  });
}

export function publishAamhiCatalogue(
  services: DemoServices,
  indexer: InMemoryBlockchainIndexer,
  tokenised: TokeniseAssetResult,
  catalogueAvailableOverride = tokenised.token.totalSupply
): PublishedDemoCatalogue {
  const sellerTrust = services.participantService.getTrustView(demoIds.seller);
  const provider = new BecknProviderNode("beckn-pn-org-aamhi-001");
  const catalogueResource = provider.publishResource({
    assetId: tokenised.token.assetId,
    tokenId: tokenised.token.tokenId,
    sellerParticipantId: demoIds.seller,
    materialCode: tokenised.metadata.materialCode,
    materialName: "Low-density polyethylene",
    verifiedQuantity: tokenised.token.totalSupply,
    unit: "kg",
    chainId: tokenised.token.mintTransaction.chainId,
    contractAddress: tokenised.token.mintTransaction.contractAddress,
    metadataUri: tokenised.token.metadataUri,
    evidenceRoot: tokenised.token.evidenceRoot,
    verificationAttestationId: tokenised.token.verificationAttestationId,
    sellerDid: sellerTrust.did,
    sellerStatus: sellerTrust.status,
    credentialIds: sellerTrust.credentialIds,
    catalogueAvailableOverride,
    unitPriceDinr: 20
  });

  const discovery = new BecknDiscoverySandbox();
  discovery.registerProvider(provider);
  const consumer = new BecknConsumerNode(
    discovery,
    services.participantService,
    services.credentialService,
    indexer,
    "2026-10-01T12:05:00Z"
  );
  const discoveryResults = consumer.search({
    materialCode: "PLASTIC-LDPE",
    state: "Maharashtra",
    district: "Raigad",
    minQuantity: 500,
    requireVerifiedCredential: true
  });

  return {
    provider,
    discovery,
    consumer,
    catalogueResource,
    discoveryResults
  };
}

export function createFundedAndLockedSettlement(
  services: DemoServices,
  tokenised: TokeniseAssetResult,
  input?: {
    settlementId?: string;
    contractId?: string;
    quantity?: number;
    unitPrice?: number;
    buyerFunding?: number;
  }
): SettlementRecord {
  const quantity = input?.quantity ?? 500;
  const unitPrice = input?.unitPrice ?? 20;
  services.settlementService.mintDinr({
    participantId: demoIds.buyer,
    amount: input?.buyerFunding ?? quantity * unitPrice,
    treasuryParticipantId: demoIds.networkAdmin,
    treasuryCredentialId: "VC-NETWORK-ADMIN-000001",
    treasuryAccount: demoAccounts.networkAdmin,
    submittedAt: "2026-10-01T12:04:00Z"
  });

  const settlement = services.settlementService.createSettlement({
    settlementId: input?.settlementId ?? demoIds.settlement,
    contractId: input?.contractId ?? demoIds.contract,
    assetId: tokenised.token.assetId,
    tokenId: tokenised.token.tokenId,
    sellerParticipantId: demoIds.seller,
    buyerParticipantId: demoIds.buyer,
    quantity,
    unitPrice,
    settlementType: "CONDITIONAL_DVP",
    requiredAttestationType: "RECEIPT_CONFIRMED",
    expiry: "2026-10-20T18:00:00Z",
    submittedAt: "2026-10-01T12:05:00Z"
  });

  services.settlementService.fundSettlement({
    settlementId: settlement.settlementId,
    buyerParticipantId: demoIds.buyer,
    buyerAccount: demoAccounts.buyer,
    submittedAt: "2026-10-01T12:06:00Z"
  });

  return services.settlementService.lockAsset({
    settlementId: settlement.settlementId,
    sellerParticipantId: demoIds.seller,
    sellerAccount: demoAccounts.seller,
    submittedAt: "2026-10-01T12:07:00Z"
  });
}

export function indexSettlementLock(indexer: InMemoryBlockchainIndexer, settlement: SettlementRecord): void {
  const lockTx = settlement.transactions.find((transaction) => transaction.type === "ASSET_LOCKED");
  indexer.index({
    type: "AssetLocked",
    txHash: lockTx?.txHash ?? "0xlocal-lock",
    blockNumber: 2,
    tokenId: settlement.tokenId,
    owner: settlement.sellerParticipantId,
    quantity: settlement.quantity,
    settlementId: settlement.settlementId
  });
}

export function createReceiptAttestation(
  services: DemoServices,
  tokenisedAsset: TokenisedDemoAsset,
  settlement: SettlementRecord,
  evidenceHash = tokenisedAsset.manifest.manifestHash
): ReturnType<AttestationService["createOperationalAttestation"]> {
  return services.attestationService.createOperationalAttestation({
    type: "RECEIPT_CONFIRMED",
    assetId: tokenisedAsset.tokenised.token.assetId,
    tokenId: tokenisedAsset.tokenised.token.tokenId,
    settlementId: settlement.settlementId,
    attestorParticipantId: demoIds.processor,
    attestorAccount: demoAccounts.processor,
    credentialId: "VC-PROCESSOR-000001",
    quantity: settlement.quantity,
    unit: "kg",
    evidenceManifestId: tokenisedAsset.manifest.manifestId,
    evidenceHash,
    eventTime: "2026-10-01T15:00:00Z"
  });
}

export function settleDemoSettlement(
  services: DemoServices,
  settlementId = demoIds.settlement
): SettlementRecord {
  services.settlementService.evaluateSettlement(settlementId, "2026-10-01T15:05:00Z");
  return services.settlementService.settle({
    settlementId,
    actorParticipantId: demoIds.buyer,
    submittedAt: "2026-10-01T15:06:00Z"
  });
}

export function indexSettlementTransfer(indexer: InMemoryBlockchainIndexer, settlement: SettlementRecord): void {
  const settleTx = settlement.transactions.find((transaction) => transaction.type === "SETTLEMENT_SETTLED");
  const txHash = settleTx?.txHash ?? "0xlocal-settle";
  indexer.index({
    type: "AssetUnlocked",
    txHash,
    blockNumber: 3,
    tokenId: settlement.tokenId,
    owner: settlement.sellerParticipantId,
    quantity: settlement.quantity,
    settlementId: settlement.settlementId
  });
  indexer.index({
    type: "TransferSingle",
    txHash,
    blockNumber: 4,
    tokenId: settlement.tokenId,
    from: settlement.sellerParticipantId,
    to: settlement.buyerParticipantId,
    quantity: settlement.quantity
  });
}

export function createObpReadyClaim(
  services: DemoServices,
  tokenised: TokeniseAssetResult,
  receiptAttestationId: string,
  claimId = demoIds.claim
): ReturnType<ClaimService["createClaim"]> {
  return services.claimService.createClaim({
    claimId,
    type: "OBP_READY_RECOVERY_CLAIM",
    assetId: tokenised.token.assetId,
    tokenId: tokenised.token.tokenId,
    sourceAttestationIds: [receiptAttestationId],
    issuerParticipantId: demoIds.seller,
    holderParticipantId: demoIds.buyer,
    quantity: 500,
    unit: "kg",
    claimBasis: {
      obpRiskCategory: "COASTAL_COMMUNITY",
      originDistrict: "Raigad",
      originState: "Maharashtra",
      isOfficialCredit: false,
      certificationRegistry: null
    },
    createdAt: "2026-10-01T15:15:00Z"
  });
}

export function buildAamhiDemoState(): AamhiDemoState {
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  const indexer = new InMemoryBlockchainIndexer();
  indexMint(indexer, tokenisedAsset.tokenised);
  const catalogue = publishAamhiCatalogue(services, indexer, tokenisedAsset.tokenised);
  const selectedResource = catalogue.discoveryResults[0];
  if (!selectedResource) {
    throw new Error("Aamhi catalogue discovery returned no selectable resource candidate");
  }

  const lockedSettlement = createFundedAndLockedSettlement(services, tokenisedAsset.tokenised);
  indexSettlementLock(indexer, lockedSettlement);
  const receiptAttestation = createReceiptAttestation(services, tokenisedAsset, lockedSettlement);
  const settlement = cloneSettlement(lockedSettlement);
  const settled = settleDemoSettlement(services, lockedSettlement.settlementId);
  indexSettlementTransfer(indexer, settled);
  const claim = createObpReadyClaim(services, tokenisedAsset.tokenised, receiptAttestation.attestationId);
  const explorerAsset = indexer.getAsset(tokenisedAsset.tokenised.token.assetId);

  return {
    services,
    indexer,
    tokenisedAsset,
    catalogue,
    selectedResource,
    settlement,
    receiptAttestation,
    settled,
    claim,
    explorerAsset
  };
}

export function buildDemoStateSummary(state: AamhiDemoState) {
  return {
    demoContext: "Project Aamhi rural SWM recovery lot, Raigad",
    dependencyModes: {
      identity: "LOCAL_MOCK",
      ethereum: "LOCAL_MOCK",
      ipfs: state.tokenisedAsset.tokenised.ipfs.dependencyMode,
      beckn: state.catalogue.catalogueResource.beckn.dependencyMode,
      settlement: state.settled.dependencyMode,
      obpRegistry: "NOT_CONNECTED"
    },
    participants: state.services.participantService.listParticipants().map((participant) => ({
      participantId: participant.participantId,
      did: participant.did,
      status: participant.status,
      roles: participant.roles
    })),
    asset: {
      assetId: state.tokenisedAsset.tokenised.token.assetId,
      tokenId: state.tokenisedAsset.tokenised.token.tokenId,
      verifiedQuantity: state.tokenisedAsset.tokenised.token.totalSupply,
      evidenceRoot: state.tokenisedAsset.tokenised.token.evidenceRoot,
      verificationAttestationId: state.tokenisedAsset.tokenised.token.verificationAttestationId
    },
    catalogue: {
      providerId: state.catalogue.catalogueResource.beckn.providerId,
      offerId: state.catalogue.catalogueResource.beckn.offerId,
      discoveredResources: state.catalogue.discoveryResults.length
    },
    settlement: {
      settlementId: state.settled.settlementId,
      state: state.settled.state,
      quantity: state.settled.quantity,
      paymentAmount: state.settled.paymentAmount,
      buyerDinrBalance: state.services.settlementService.getDinrBalance(demoIds.buyer).balance,
      sellerDinrBalance: state.services.settlementService.getDinrBalance(demoIds.seller).balance
    },
    claim: {
      claimId: state.claim.claimId,
      type: state.claim.type,
      quantity: state.claim.quantity,
      isOfficialCredit: state.claim.claimBasis.isOfficialCredit,
      boundaryStatement: state.claim.claimBasis.boundaryStatement
    }
  };
}

function seedParticipants(participantService: ParticipantService): void {
  for (const participant of readParticipants()) {
    participantService.createParticipant({
      participantId: participant.participantId,
      legalName: participant.legalName,
      displayName: participant.displayName,
      organisationType: participant.organisationType,
      registrationReference: participant.registrationReference,
      jurisdiction: participant.jurisdiction,
      roles: participant.roles,
      createdAt: participant.createdAt
    });

    for (const account of participant.smartAccounts) {
      participantService.bindAccount({
        participantId: participant.participantId,
        chainId: account.chainId,
        accountAddress: account.accountAddress,
        accountType: account.accountType,
        purpose: account.purpose
      });
    }
  }
}

function issueDemoCredentials(credentialService: CredentialService): void {
  const common = {
    validFrom: "2026-10-01T00:00:00Z",
    validUntil: "2027-03-31T23:59:59Z"
  };
  credentialService.issueCredential({
    credentialId: "VC-NETWORK-ADMIN-000001",
    participantId: demoIds.networkAdmin,
    type: "OrganisationCredential",
    roles: ["NETWORK_ADMIN"],
    ethereumAccounts: [demoAccounts.networkAdmin],
    ...common
  });
  credentialService.issueCredential({
    credentialId: "VC-ORIGINATOR-000001",
    participantId: demoIds.seller,
    type: "RecoveryOriginatorCredential",
    roles: ["RECOVERY_ORIGINATOR"],
    materialClasses: ["PLASTIC-LDPE"],
    ethereumAccounts: [demoAccounts.seller],
    ...common
  });
  credentialService.issueCredential({
    credentialId: "VC-BUYER-000001",
    participantId: demoIds.buyer,
    type: "NetworkParticipantCredential",
    roles: ["BUYER"],
    materialClasses: ["PLASTIC-LDPE"],
    ethereumAccounts: [demoAccounts.buyer],
    ...common
  });
  credentialService.issueCredential({
    credentialId: "VC-PROCESSOR-000001",
    participantId: demoIds.processor,
    type: "ProcessorCredential",
    roles: ["PROCESSOR"],
    materialClasses: ["PLASTIC-LDPE"],
    ethereumAccounts: [demoAccounts.processor],
    ...common
  });
  credentialService.issueCredential({
    credentialId: "VC-VERIFIER-000001",
    participantId: demoIds.verifier,
    type: "VerifierCredential",
    roles: ["VERIFIER"],
    materialClasses: ["PLASTIC-LDPE"],
    ethereumAccounts: [demoAccounts.verifier],
    ...common
  });
  credentialService.issueCredential({
    credentialId: "VC-AI-AGENT-000001",
    participantId: demoIds.agent,
    type: "AgentDelegationCredential",
    roles: ["AI_AGENT_SERVICE"],
    ethereumAccounts: [demoAccounts.agent],
    ...common
  });
}

function readParticipants(): ParticipantRecord[] {
  return readJson<ParticipantRecord[]>("samples/aamhi-demo/participants.json");
}

function readSampleAsset() {
  return readJson<{
    assetId: string;
    originatorParticipantId: string;
    materialCode: string;
    quantity: { estimated: number; verified: number; unit: "kg" };
    origin: { locationReference?: string };
    collectionContext: {
      villageOrRoute: string;
      collectionType: "RURAL_SWM" | "COASTAL_CLEANUP" | "MANGROVE_CLEANUP" | "AGGREGATION_CENTER";
      obpRiskContext?: "COASTAL_COMMUNITY" | "WATERWAY_ADJACENT" | "POTENTIAL_OBP" | "NOT_ASSESSED";
    };
    quality: { grade: "UNSORTED" | "SORTED" | "BALED" | "PROCESSOR_ACCEPTED"; contaminationPercent: number };
    custody: { facilityReference: string };
    createdAt: string;
  }>("samples/aamhi-demo/recovery-asset.json");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;
}

function cloneSettlement(settlement: SettlementRecord): SettlementRecord {
  return JSON.parse(JSON.stringify(settlement)) as SettlementRecord;
}
