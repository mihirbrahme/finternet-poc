import type {
  AgentProposalForPolicy,
  BuyerAgentPolicy,
  PolicyCheck,
  PolicyDecision
} from "../../../services/core-api/src/modules/agent/index.js";

export const defaultBuyerAgentPolicy: BuyerAgentPolicy = {
  allowedMaterialCode: "PLASTIC-LDPE",
  maxTransactionDinr: 50_000,
  maxAuthorityHours: 24,
  requireCredentialledSeller: true
};

export const deterministicBuyerPolicyEngine = {
  evaluate(proposal: AgentProposalForPolicy, policy: BuyerAgentPolicy = defaultBuyerAgentPolicy): PolicyDecision {
    const checks: PolicyCheck[] = [
      checkTotalWithinLimit(proposal, policy),
      checkMaterialAllowed(proposal, policy),
      checkSellerCredentialled(proposal, policy),
      checkExpiryWithinAuthority(proposal, policy)
    ];
    const reasons = checks.filter((check) => check.status === "FAIL").map((check) => check.reason);
    return {
      allow: reasons.length === 0,
      checks,
      reasons,
      dependencyMode: "LOCAL_MOCK"
    };
  }
};

function checkTotalWithinLimit(proposal: AgentProposalForPolicy, policy: BuyerAgentPolicy): PolicyCheck {
  const pass = proposal.paymentAmountDinr <= policy.maxTransactionDinr;
  return {
    check: "TOTAL_WITHIN_LIMIT",
    status: pass ? "PASS" : "FAIL",
    reason: pass
      ? `Payment ${proposal.paymentAmountDinr} dINR is within ${policy.maxTransactionDinr} dINR`
      : `Payment ${proposal.paymentAmountDinr} dINR exceeds ${policy.maxTransactionDinr} dINR`
  };
}

function checkMaterialAllowed(proposal: AgentProposalForPolicy, policy: BuyerAgentPolicy): PolicyCheck {
  const pass = proposal.materialCode === policy.allowedMaterialCode;
  return {
    check: "MATERIAL_ALLOWED",
    status: pass ? "PASS" : "FAIL",
    reason: pass
      ? `Material ${proposal.materialCode} is allowed`
      : `Material ${proposal.materialCode} is outside delegated authority ${policy.allowedMaterialCode}`
  };
}

function checkSellerCredentialled(proposal: AgentProposalForPolicy, policy: BuyerAgentPolicy): PolicyCheck {
  const pass = !policy.requireCredentialledSeller || proposal.sellerCredentialled;
  return {
    check: "SELLER_CREDENTIALLED",
    status: pass ? "PASS" : "FAIL",
    reason: pass ? "Seller has active credentialled originator status" : "Seller lacks active credentialled originator status"
  };
}

function checkExpiryWithinAuthority(proposal: AgentProposalForPolicy, policy: BuyerAgentPolicy): PolicyCheck {
  const durationMs = new Date(proposal.expiresAt).getTime() - new Date(proposal.proposedAt).getTime();
  const maxMs = policy.maxAuthorityHours * 60 * 60 * 1000;
  const pass = durationMs > 0 && durationMs <= maxMs;
  return {
    check: "EXPIRY_WITHIN_AUTHORITY",
    status: pass ? "PASS" : "FAIL",
    reason: pass
      ? `Approval expiry is within ${policy.maxAuthorityHours} hours`
      : `Approval expiry exceeds ${policy.maxAuthorityHours} hours`
  };
}
