import assert from "node:assert/strict";
import type { AgentProposalForPolicy } from "../../../services/core-api/src/modules/agent/index.js";
import { defaultBuyerAgentPolicy, deterministicBuyerPolicyEngine } from "../policies/index.js";

const baseProposal: AgentProposalForPolicy = {
  assetId: "RWA-RAI-2026-000001",
  sellerParticipantId: "ORG-AAMHI-001",
  materialCode: "PLASTIC-LDPE",
  quantityKg: 500,
  unitPriceDinr: 20,
  paymentAmountDinr: 10_000,
  sellerCredentialled: true,
  proposedAt: "2026-10-01T12:00:00.000Z",
  expiresAt: "2026-10-02T12:00:00.000Z"
};

{
  const decision = deterministicBuyerPolicyEngine.evaluate(baseProposal, defaultBuyerAgentPolicy);
  assert.equal(decision.allow, true);
  assert.equal(decision.checks.every((check) => check.status === "PASS"), true);
}

{
  const decision = deterministicBuyerPolicyEngine.evaluate(
    {
      ...baseProposal,
      quantityKg: 2600,
      paymentAmountDinr: 52_000
    },
    defaultBuyerAgentPolicy
  );
  assert.equal(decision.allow, false);
  assert.match(decision.reasons.join(" | "), /exceeds 50000 dINR/);
}

{
  const decision = deterministicBuyerPolicyEngine.evaluate(
    {
      ...baseProposal,
      materialCode: "PLASTIC-PET"
    },
    defaultBuyerAgentPolicy
  );
  assert.equal(decision.allow, false);
  assert.match(decision.reasons.join(" | "), /outside delegated authority PLASTIC-LDPE/);
}

{
  const decision = deterministicBuyerPolicyEngine.evaluate(
    {
      ...baseProposal,
      sellerCredentialled: false
    },
    defaultBuyerAgentPolicy
  );
  assert.equal(decision.allow, false);
  assert.match(decision.reasons.join(" | "), /lacks active credentialled originator status/);
}

{
  const decision = deterministicBuyerPolicyEngine.evaluate(
    {
      ...baseProposal,
      expiresAt: "2026-10-02T12:00:01.000Z"
    },
    defaultBuyerAgentPolicy
  );
  assert.equal(decision.allow, false);
  assert.match(decision.reasons.join(" | "), /exceeds 24 hours/);
}

console.log("Buyer-agent policy tests passed.");
