import assert from "node:assert/strict";
import {
  buildTokenisedAamhiAsset,
  createDemoServices,
  demoIds,
  indexMint,
  publishAamhiCatalogue
} from "../../../deployment/scripts/demo-state.js";
import { InMemoryBlockchainIndexer } from "../../../services/blockchain-indexer/index.js";
import { BuyerAgentGateway, InMemoryAgentAuditLog } from "../../../services/core-api/src/modules/agent/index.js";
import { defaultBuyerAgentPolicy, deterministicBuyerPolicyEngine } from "../policies/index.js";
import { createLocalBuyerAgentTools } from "../tools/index.js";

const services = createDemoServices();
const tokenisedAsset = buildTokenisedAamhiAsset(services);
const indexer = new InMemoryBlockchainIndexer();
indexMint(indexer, tokenisedAsset.tokenised);
const catalogue = publishAamhiCatalogue(services, indexer, tokenisedAsset.tokenised);
const auditLog = new InMemoryAgentAuditLog();
const tools = createLocalBuyerAgentTools({
  consumer: catalogue.consumer,
  indexer,
  services
});
const gateway = new BuyerAgentGateway(tools, defaultBuyerAgentPolicy, deterministicBuyerPolicyEngine, auditLog);

const result = gateway.proposeTransaction({
  agentRunId: "AGR-000021",
  userInstruction:
    "Find verified LDPE assets of at least 250 kg from eligible sellers under the configured price threshold.",
  buyerParticipantId: demoIds.buyer,
  now: "2026-10-01T12:10:00.000Z",
  contractId: "CTR-AGENT-000001",
  settlementId: "STL-AGENT-000001",
  constraints: {
    materialCode: "PLASTIC-LDPE",
    state: "Maharashtra",
    district: "Raigad",
    minQuantityKg: 250,
    maxUnitPriceDinr: 22,
    maxTransactionDinr: 50_000,
    requireCredentialledSeller: true,
    expiryHours: 24
  }
});

assert.equal(result.status, "PROPOSED_FOR_APPROVAL");
assert.equal(result.candidates.length, 1);
assert.equal(result.selectedCandidate?.discovery.resource.assetId, demoIds.asset);
assert.equal(result.offer?.paymentAmountDinr, 5000);
assert.equal(result.offer?.currencyToken, "dINR");
assert.equal(result.offer?.evidenceBackedClaimBoundary, "OBP_READY_RECOVERY_CLAIM_NOT_OFFICIAL_CREDIT");
assert.equal(result.policyDecision?.allow, true);
assert.equal(result.approval?.status, "PENDING");
assert.match(result.approval?.boundaryStatement ?? "", /isOfficialCredit=false/);
assert.equal(result.settlementDraft?.settlement.settlementId, "STL-AGENT-000001");
assert.equal(result.settlementDraft?.settlement.state, "CREATED");
assert.equal(result.settlementDraft?.submittedTransactionReference.type, "SETTLEMENT_CREATED");

const events = auditLog.list("AGR-000021");
assert.equal(events[0]?.type, "USER_INSTRUCTION");
assert.ok(events.some((event) => event.type === "TOOL_CALL" && event.payload.toolName === "discoverAssets"));
assert.ok(events.some((event) => event.type === "TOOL_OUTPUT" && event.payload.toolName === "prepareSettlement"));
assert.ok(events.some((event) => event.type === "POLICY_CHECK"));
assert.ok(events.some((event) => event.type === "HUMAN_APPROVAL"));
assert.ok(events.some((event) => event.type === "SUBMITTED_TRANSACTION_REFERENCE"));
assert.equal(
  events.some((event) => JSON.stringify(event.payload).includes("privateKey")),
  false
);

auditLog.append({
  agentRunId: "AGR-000021",
  type: "TOOL_OUTPUT",
  at: "2026-10-01T12:10:00.000Z",
  payload: {
    nested: {
      privateKey: "0xshould-not-be-logged",
      safeReference: "visible"
    },
    list: [{ seedPhrase: "should-not-be-logged", event: "kept" }]
  }
});
const sanitized = auditLog.list("AGR-000021").at(-1);
assert.equal(JSON.stringify(sanitized?.payload).includes("should-not-be-logged"), false);
assert.equal(JSON.stringify(sanitized?.payload).includes("visible"), true);

console.log("Buyer-agent flow and audit tests passed.");
