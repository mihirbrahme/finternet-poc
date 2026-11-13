import assert from "node:assert/strict";
import {
  buildAamhiDemoState,
  buildTokenisedAamhiAsset,
  createDemoServices,
  createFundedAndLockedSettlement,
  createObpReadyClaim,
  createReceiptAttestation,
  demoAccounts,
  demoIds,
  indexMint,
  indexSettlementLock,
  publishAamhiCatalogue
} from "../../deployment/scripts/demo-state.js";
import { InMemoryBlockchainIndexer } from "../../services/blockchain-indexer/index.js";

function assertThrowsMessage(action: () => unknown, pattern: RegExp): Error {
  try {
    action();
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.match(error.message, pattern);
    return error;
  }
  assert.fail(`Expected error matching ${pattern}`);
}

{
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  const settlement = createFundedAndLockedSettlement(services, tokenisedAsset.tokenised);
  services.credentialService.revokeCredential("VC-PROCESSOR-000001", "2026-10-01T14:59:00Z");

  assertThrowsMessage(
    () => createReceiptAttestation(services, tokenisedAsset, settlement),
    /Processor credential invalid: CREDENTIAL_REVOKED/
  );
}

{
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  const indexer = new InMemoryBlockchainIndexer();
  indexMint(indexer, tokenisedAsset.tokenised);
  const settlement = createFundedAndLockedSettlement(services, tokenisedAsset.tokenised, {
    settlementId: "STL-STALE-CATALOGUE",
    contractId: "CTR-STALE-CATALOGUE",
    quantity: 600,
    buyerFunding: 12_000
  });
  indexSettlementLock(indexer, settlement);

  const catalogue = publishAamhiCatalogue(services, indexer, tokenisedAsset.tokenised, 1000);
  assert.equal(catalogue.discoveryResults.length, 1);
  assert.equal(catalogue.discoveryResults[0].verification.liveAvailableQuantity, 400);
  assert.equal(catalogue.discoveryResults[0].verification.selectableQuantity, 400);
  assert.equal(catalogue.discoveryResults[0].verification.staleCatalogueCapped, true);
}

{
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  const settlement = services.settlementService.createSettlement({
    settlementId: "STL-INSUFFICIENT-DINR",
    contractId: "CTR-INSUFFICIENT-DINR",
    assetId: tokenisedAsset.tokenised.token.assetId,
    tokenId: tokenisedAsset.tokenised.token.tokenId,
    sellerParticipantId: demoIds.seller,
    buyerParticipantId: demoIds.buyer,
    quantity: 500,
    unitPrice: 20,
    expiry: "2026-10-20T18:00:00Z",
    submittedAt: "2026-10-01T12:05:00Z"
  });
  services.settlementService.mintDinr({
    participantId: demoIds.buyer,
    amount: 9_999,
    treasuryParticipantId: demoIds.networkAdmin,
    treasuryCredentialId: "VC-NETWORK-ADMIN-000001",
    treasuryAccount: demoAccounts.networkAdmin,
    submittedAt: "2026-10-01T12:04:00Z"
  });

  assertThrowsMessage(
    () =>
      services.settlementService.fundSettlement({
        settlementId: settlement.settlementId,
        buyerParticipantId: demoIds.buyer,
        buyerAccount: demoAccounts.buyer,
        submittedAt: "2026-10-01T12:06:00Z"
      }),
    /Insufficient dINR/
  );
}

{
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  assertThrowsMessage(
    () =>
      services.settlementService.createSettlement({
        settlementId: "STL-INSUFFICIENT-ASSET",
        contractId: "CTR-INSUFFICIENT-ASSET",
        assetId: tokenisedAsset.tokenised.token.assetId,
        tokenId: tokenisedAsset.tokenised.token.tokenId,
        sellerParticipantId: demoIds.seller,
        buyerParticipantId: demoIds.buyer,
        quantity: 1001,
        unitPrice: 20,
        expiry: "2026-10-20T18:00:00Z",
        submittedAt: "2026-10-01T12:05:00Z"
      }),
    /Seller does not hold enough unlocked asset/
  );
}

{
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  const settlement = createFundedAndLockedSettlement(services, tokenisedAsset.tokenised);

  assertThrowsMessage(
    () =>
      services.attestationService.createOperationalAttestation({
        type: "RECEIPT_CONFIRMED",
        assetId: tokenisedAsset.tokenised.token.assetId,
        tokenId: tokenisedAsset.tokenised.token.tokenId,
        settlementId: settlement.settlementId,
        attestorParticipantId: demoIds.buyer,
        attestorAccount: demoAccounts.buyer,
        credentialId: "VC-BUYER-000001",
        quantity: 500,
        unit: "kg",
        evidenceManifestId: tokenisedAsset.manifest.manifestId,
        evidenceHash: tokenisedAsset.manifest.manifestHash,
        eventTime: "2026-10-01T15:00:00Z"
      }),
    /Participant is not a processor/
  );
}

{
  const state = buildAamhiDemoState();
  assertThrowsMessage(
    () => createObpReadyClaim(state.services, state.tokenisedAsset.tokenised, state.receiptAttestation.attestationId, "CLM-000002"),
    /Claim conflict/
  );
}

{
  const services = createDemoServices();
  const tokenisedAsset = buildTokenisedAamhiAsset(services);
  const settlement = createFundedAndLockedSettlement(services, tokenisedAsset.tokenised);
  const alteredReceipt = createReceiptAttestation(
    services,
    tokenisedAsset,
    settlement,
    "altered-evidence-root-that-does-not-match-verified-asset"
  );

  assertThrowsMessage(
    () => createObpReadyClaim(services, tokenisedAsset.tokenised, alteredReceipt.attestationId, "CLM-ALTERED-EVIDENCE"),
    /evidence hash does not match verified asset evidence root/
  );
}

console.log("Negative-path acceptance tests passed.");
