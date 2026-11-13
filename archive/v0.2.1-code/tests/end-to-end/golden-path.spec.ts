import assert from "node:assert/strict";
import { buildAamhiDemoState, demoIds } from "../../deployment/scripts/demo-state.js";

const state = buildAamhiDemoState();
const token = state.tokenisedAsset.tokenised.token;

assert.equal(state.services.participantService.listParticipants().length, 6);
assert.equal(state.services.credentialService.verifyCredential({
  credentialId: "VC-ORIGINATOR-000001",
  requiredRole: "RECOVERY_ORIGINATOR",
  at: "2026-10-01T12:00:00Z"
}).valid, true);

assert.equal(state.tokenisedAsset.asset.assetId, demoIds.asset);
assert.equal(state.tokenisedAsset.asset.verificationStatus, "VERIFIED");
assert.equal(state.tokenisedAsset.asset.lifecycleStatus, "TOKENISED");
assert.equal(state.tokenisedAsset.manifest.dependencyMode, "LOCAL_MOCK");
assert.equal(state.tokenisedAsset.manifest.evidence.length, 3);
assert.equal(token.totalSupply, 1000);
assert.equal(token.holderBalances[demoIds.seller], 500);
assert.equal(token.holderBalances[demoIds.buyer], 500);
assert.equal(token.lockedBalances[demoIds.seller], 0);
assert.equal(state.tokenisedAsset.tokenised.ipfs.dependencyMode, "LOCAL_MOCK");

assert.equal(state.catalogue.catalogueResource.assetId, demoIds.asset);
assert.equal(state.catalogue.catalogueResource.beckn.dependencyMode, "SANDBOX_ADAPTER");
assert.equal(state.catalogue.discoveryResults.length, 1);
assert.equal(state.selectedResource.verification.sellerTrusted, true);
assert.equal(state.selectedResource.verification.tokenExists, true);
assert.equal(state.selectedResource.verification.evidenceRootMatches, true);
assert.equal(state.selectedResource.verification.liveAvailableQuantity, 1000);

assert.equal(state.settlement.settlementId, demoIds.settlement);
assert.equal(state.settlement.state, "READY");
assert.equal(state.settlement.dinrLeg.status, "LOCKED");
assert.equal(state.settlement.assetLeg.status, "LOCKED");
assert.equal(state.receiptAttestation.type, "RECEIPT_CONFIRMED");
assert.equal(state.receiptAttestation.quantity, 500);
assert.equal(state.receiptAttestation.chain.dependencyMode, "LOCAL_MOCK");

assert.equal(state.settled.state, "SETTLED");
assert.equal(state.settled.dinrLeg.status, "RELEASED");
assert.equal(state.settled.assetLeg.status, "TRANSFERRED");
assert.equal(state.services.settlementService.getDinrBalance(demoIds.buyer).balance, 0);
assert.equal(state.services.settlementService.getDinrBalance(demoIds.seller).balance, 10_000);

assert.equal(state.claim.claimId, demoIds.claim);
assert.equal(state.claim.type, "OBP_READY_RECOVERY_CLAIM");
assert.equal(state.claim.quantity, 500);
assert.equal(state.claim.claimBasis.isOfficialCredit, false);
assert.equal(state.claim.externalReference, null);
assert.match(state.claim.claimBasis.boundaryStatement ?? "", /not official OBP credit issuance/);
assert.match(state.claim.claimBasis.boundaryStatement ?? "", /EPR certificate/);
assert.equal(state.claim.evidenceReferences[0]?.evidenceHash, state.tokenisedAsset.manifest.manifestHash);

assert.ok(state.explorerAsset);
assert.equal(state.explorerAsset?.assetId, demoIds.asset);
assert.equal(state.explorerAsset?.balances[demoIds.seller], 500);
assert.equal(state.explorerAsset?.balances[demoIds.buyer], 500);
assert.equal(state.explorerAsset?.lockedBalances[demoIds.seller], 0);
assert.equal(state.indexer.listEvents().map((event) => event.type).join(" -> "), "AssetMinted -> AssetLocked -> AssetUnlocked -> TransferSingle");

console.log("Golden-path acceptance test passed.");
