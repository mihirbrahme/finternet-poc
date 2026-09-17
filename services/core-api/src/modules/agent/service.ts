import type {
  AgentProposalForPolicy,
  BuyerAgentPolicy,
  BuyerAgentRunInput,
  BuyerAgentRunResult,
  BuyerAgentTools,
  CandidateAssessment,
  PolicyDecision
} from "./types.js";
import { InMemoryAgentAuditLog } from "./auditLog.js";
import type { VerifiedDiscoveryResource } from "../../../../../beckn/consumer-node/index.js";

export interface PolicyEngine {
  evaluate(proposal: AgentProposalForPolicy, policy: BuyerAgentPolicy): PolicyDecision;
}

export class BuyerAgentGateway {
  constructor(
    private readonly tools: BuyerAgentTools,
    private readonly policy: BuyerAgentPolicy,
    private readonly policyEngine: PolicyEngine,
    private readonly auditLog = new InMemoryAgentAuditLog()
  ) {}

  getAuditLog(): InMemoryAgentAuditLog {
    return this.auditLog;
  }

  proposeTransaction(input: BuyerAgentRunInput): BuyerAgentRunResult {
    this.audit(input.agentRunId, "USER_INSTRUCTION", input.now, {
      userInstruction: input.userInstruction,
      constraints: input.constraints
    });

    const discovery = this.callTool(input.agentRunId, input.now, "discoverAssets", input.constraints, () =>
      this.tools.discoverAssets(input.constraints)
    );

    const candidates = discovery.map((candidate) => this.assessCandidate(input, candidate));
    const selectedCandidate = candidates.find((candidate) => candidate.eligible);
    if (!selectedCandidate) {
      return {
        agentRunId: input.agentRunId,
        userInstruction: input.userInstruction,
        constraints: input.constraints,
        candidates,
        status: "NO_ELIGIBLE_CANDIDATE"
      };
    }

    const offer = this.callTool(
      input.agentRunId,
      input.now,
      "prepareOffer",
      {
        buyerParticipantId: input.buyerParticipantId,
        assetId: selectedCandidate.discovery.resource.assetId,
        quantityKg: input.constraints.minQuantityKg
      },
      () =>
        this.tools.prepareOffer({
          agentRunId: input.agentRunId,
          buyerParticipantId: input.buyerParticipantId,
          resource: selectedCandidate.discovery,
          quantityKg: input.constraints.minQuantityKg,
          preparedAt: input.now,
          contractId: input.contractId
        })
    );
    const expiresAt = addHours(input.now, input.constraints.expiryHours);
    const proposal: AgentProposalForPolicy = {
      assetId: offer.assetId,
      sellerParticipantId: offer.sellerParticipantId,
      materialCode: offer.materialCode,
      quantityKg: offer.quantityKg,
      unitPriceDinr: offer.unitPriceDinr,
      paymentAmountDinr: offer.paymentAmountDinr,
      sellerCredentialled: selectedCandidate.sellerVerification.verified && selectedCandidate.credentialStatus.valid,
      proposedAt: input.now,
      expiresAt
    };
    const policyDecision = this.policyEngine.evaluate(proposal, this.policy);
    this.audit(input.agentRunId, "POLICY_CHECK", input.now, {
      decision: policyDecision
    });

    if (!policyDecision.allow) {
      return {
        agentRunId: input.agentRunId,
        userInstruction: input.userInstruction,
        constraints: input.constraints,
        candidates,
        selectedCandidate,
        offer,
        policyDecision,
        status: "DENIED"
      };
    }

    const settlementDraft = this.callTool(
      input.agentRunId,
      input.now,
      "prepareSettlement",
      {
        settlementId: input.settlementId,
        offerId: offer.offerId,
        expiresAt
      },
      () =>
        this.tools.prepareSettlement({
          offer,
          settlementId: input.settlementId,
          expiresAt,
          submittedAt: input.now
        })
    );
    this.audit(input.agentRunId, "SUBMITTED_TRANSACTION_REFERENCE", input.now, {
      settlementId: settlementDraft.settlement.settlementId,
      transaction: settlementDraft.submittedTransactionReference
    });

    const approval = this.callTool(
      input.agentRunId,
      input.now,
      "requestHumanApproval",
      {
        offerId: offer.offerId,
        settlementId: settlementDraft.settlement.settlementId,
        expiresAt
      },
      () =>
        this.tools.requestHumanApproval({
          agentRunId: input.agentRunId,
          buyerParticipantId: input.buyerParticipantId,
          offer,
          expiresAt
        })
    );
    this.audit(input.agentRunId, "HUMAN_APPROVAL", input.now, {
      approval
    });

    return {
      agentRunId: input.agentRunId,
      userInstruction: input.userInstruction,
      constraints: input.constraints,
      candidates,
      selectedCandidate,
      offer,
      settlementDraft,
      policyDecision,
      approval,
      status: "PROPOSED_FOR_APPROVAL"
    };
  }

  private assessCandidate(input: BuyerAgentRunInput, resource: VerifiedDiscoveryResource): CandidateAssessment {
    const asset = this.callTool(input.agentRunId, input.now, "getAsset", { assetId: resource.resource.assetId }, () =>
      this.tools.getAsset({ assetId: resource.resource.assetId })
    );
    const tokenState = this.callTool(
      input.agentRunId,
      input.now,
      "getTokenState",
      { tokenId: resource.resource.tokenId },
      () => this.tools.getTokenState({ tokenId: resource.resource.tokenId })
    );
    const sellerVerification = this.callTool(
      input.agentRunId,
      input.now,
      "verifyParticipant",
      { participantId: resource.resource.sellerParticipantId, requiredRole: "RECOVERY_ORIGINATOR" },
      () =>
        this.tools.verifyParticipant({
          participantId: resource.resource.sellerParticipantId,
          requiredRole: "RECOVERY_ORIGINATOR",
          at: input.now
        })
    );
    const credentialId = resource.resource.trust.credentialIds[0] ?? "";
    const credentialStatus = this.callTool(
      input.agentRunId,
      input.now,
      "getCredentialStatus",
      { credentialId, requiredRole: "RECOVERY_ORIGINATOR" },
      () =>
        this.tools.getCredentialStatus({
          credentialId,
          requiredRole: "RECOVERY_ORIGINATOR",
          at: input.now
        })
    );

    const reasons: string[] = [];
    if (asset.materialCode !== input.constraints.materialCode) {
      reasons.push(`Material mismatch: ${asset.materialCode}`);
    }
    if (resource.resource.terms.unitPriceDinr > input.constraints.maxUnitPriceDinr) {
      reasons.push(`Unit price exceeds ceiling: ${resource.resource.terms.unitPriceDinr}`);
    }
    if (resource.verification.selectableQuantity < input.constraints.minQuantityKg) {
      reasons.push(`Insufficient live quantity: ${resource.verification.selectableQuantity}`);
    }
    if (input.constraints.requireCredentialledSeller && (!sellerVerification.verified || !credentialStatus.valid)) {
      reasons.push("Seller lacks active recovery originator credential");
    }

    return {
      discovery: resource,
      asset,
      tokenState,
      sellerVerification,
      credentialStatus,
      eligible: reasons.length === 0,
      reasons
    };
  }

  private callTool<T>(
    agentRunId: string,
    at: string,
    toolName: string,
    input: Record<string, unknown>,
    action: () => T
  ): T {
    this.audit(agentRunId, "TOOL_CALL", at, { toolName, input });
    const output = action();
    this.audit(agentRunId, "TOOL_OUTPUT", at, { toolName, output: compactForAudit(output) });
    return output;
  }

  private audit(
    agentRunId: string,
    type: Parameters<InMemoryAgentAuditLog["append"]>[0]["type"],
    at: string,
    payload: Record<string, unknown>
  ): void {
    this.auditLog.append({
      agentRunId,
      type,
      at,
      payload
    });
  }
}

function addHours(isoDate: string, hours: number): string {
  return new Date(new Date(isoDate).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function compactForAudit(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return { value };
  }
  const record = value as Record<string, unknown>;
  return {
    ...record,
    privateKey: undefined,
    seedPhrase: undefined
  };
}
