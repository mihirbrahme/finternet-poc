import type {
  AgentOfferDraft,
  BuyerAgentIntentConstraints,
  BuyerAgentTools,
  HumanApprovalRequest,
  ParticipantVerificationResult
} from "../../../services/core-api/src/modules/agent/index.js";
import type { ParticipantRole } from "../../../services/core-api/src/modules/participants/index.js";
import type { LocalBuyerAgentToolContext } from "./types.js";

const DEFAULT_AGENT_CONTRACT_ID = "CTR-AGENT-000001";

export function createLocalBuyerAgentTools(context: LocalBuyerAgentToolContext): BuyerAgentTools {
  return {
    discoverAssets(input: BuyerAgentIntentConstraints) {
      return context.consumer.search({
        materialCode: input.materialCode,
        state: input.state,
        district: input.district,
        minQuantity: input.minQuantityKg,
        requireVerifiedCredential: input.requireCredentialledSeller
      });
    },

    getAsset(input) {
      return context.services.assetService.toPublicMetadata(input.assetId);
    },

    getTokenState(input) {
      const tokenState = input.tokenId
        ? context.indexer.getToken(input.tokenId)
        : input.assetId
          ? context.indexer.getAsset(input.assetId)
          : undefined;
      if (!tokenState) {
        throw new Error(`Indexed token state not found for agent lookup: ${input.tokenId ?? input.assetId ?? "unknown"}`);
      }
      return tokenState;
    },

    verifyParticipant(input) {
      return verifyParticipant(context, input.participantId, input.requiredRole, input.at);
    },

    getCredentialStatus(input) {
      return context.services.credentialService.verifyCredential({
        credentialId: input.credentialId,
        requiredRole: input.requiredRole,
        at: input.at
      });
    },

    prepareOffer(input) {
      const resource = input.resource.resource;
      const paymentAmountDinr = input.quantityKg * resource.terms.unitPriceDinr;
      const offer: AgentOfferDraft = {
        offerId: `OFR-${input.agentRunId.replace(/^AGR-/, "")}`,
        contractId: input.contractId ?? DEFAULT_AGENT_CONTRACT_ID,
        assetId: resource.assetId,
        tokenId: resource.tokenId,
        sellerParticipantId: resource.sellerParticipantId,
        buyerParticipantId: input.buyerParticipantId,
        materialCode: resource.material.code,
        quantityKg: input.quantityKg,
        unitPriceDinr: resource.terms.unitPriceDinr,
        paymentAmountDinr,
        currencyToken: "dINR",
        evidenceBackedClaimBoundary: "OBP_READY_RECOVERY_CLAIM_NOT_OFFICIAL_CREDIT",
        dependencyMode: "LOCAL_MOCK",
        preparedAt: input.preparedAt
      };
      return offer;
    },

    prepareSettlement(input) {
      const settlement = context.services.settlementService.createSettlement({
        settlementId: input.settlementId,
        contractId: input.offer.contractId,
        assetId: input.offer.assetId,
        tokenId: input.offer.tokenId,
        sellerParticipantId: input.offer.sellerParticipantId,
        buyerParticipantId: input.offer.buyerParticipantId,
        quantity: input.offer.quantityKg,
        unitPrice: input.offer.unitPriceDinr,
        settlementType: "CONDITIONAL_DVP",
        requiredAttestationType: "RECEIPT_CONFIRMED",
        expiry: input.expiresAt,
        submittedAt: input.submittedAt
      });
      const submittedTransactionReference = settlement.transactions.find(
        (transaction) => transaction.type === "SETTLEMENT_CREATED"
      );
      if (!submittedTransactionReference) {
        throw new Error(`Settlement draft has no submitted transaction reference: ${settlement.settlementId}`);
      }
      return {
        settlement,
        submittedTransactionReference,
        dependencyMode: "LOCAL_MOCK"
      };
    },

    requestHumanApproval(input) {
      const approval: HumanApprovalRequest = {
        approvalId: `APR-${input.agentRunId.replace(/^AGR-/, "")}`,
        agentRunId: input.agentRunId,
        participantId: input.buyerParticipantId,
        proposedAction: "CREATE_SETTLEMENT_DRAFT",
        counterparty: input.offer.sellerParticipantId,
        assetId: input.offer.assetId,
        tokenId: input.offer.tokenId,
        quantityKg: input.offer.quantityKg,
        unitPriceDinr: input.offer.unitPriceDinr,
        maximumAmountDinr: input.offer.paymentAmountDinr,
        currency: "dINR",
        expiresAt: input.expiresAt,
        status: "PENDING",
        boundaryStatement:
          "Human approval is required before funding, asset lock or final settlement. dINR is sandbox programmable settlement value only; OBP output remains an OBP_READY_RECOVERY_CLAIM with isOfficialCredit=false.",
        dependencyMode: "LOCAL_MOCK"
      };
      return approval;
    }
  };
}

function verifyParticipant(
  context: LocalBuyerAgentToolContext,
  participantId: string,
  requiredRole: ParticipantRole,
  at: string
): ParticipantVerificationResult {
  const participant = context.services.participantService.getTrustView(participantId);
  const credentialResults = participant.credentialIds.map((credentialId) =>
    context.services.credentialService.verifyCredential({
      credentialId,
      requiredRole,
      at
    })
  );
  const activeCredentialIds = credentialResults
    .filter((result) => result.valid && result.credential)
    .map((result) => result.credential?.credentialId)
    .filter((credentialId): credentialId is string => Boolean(credentialId));
  const verified = participant.status === "ACTIVE" && activeCredentialIds.length > 0;

  return {
    participant,
    requiredRole,
    activeCredentialIds,
    verified,
    reason: verified ? "ACTIVE_CREDENTIALLED_PARTICIPANT" : "NO_ACTIVE_ROLE_CREDENTIAL",
    dependencyMode: participant.dependencyMode
  };
}
