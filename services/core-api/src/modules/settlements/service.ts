import { sha256CanonicalJson } from "../../shared/hash.js";
import type { CanonicalJsonValue } from "../../shared/canonicalJson.js";
import type { CredentialService } from "../credentials/service.js";
import type { ParticipantService } from "../participants/service.js";
import type { TokenisationService } from "../tokenisation/service.js";
import { SettlementRepository } from "./repository.js";
import type {
  CreateSettlementInput,
  DinrBalanceView,
  FundSettlementInput,
  LockAssetInput,
  MintDinrInput,
  SettlementActionInput,
  SettlementRecord,
  SettlementState,
  SettlementTransactionType,
  SimulatedSettlementTransaction
} from "./types.js";

const DEFAULT_CHAIN_ID = 31337;
const DEFAULT_SETTLEMENT_CONTRACT = "0x000000000000000000000000000000000000d007";

export class SettlementService {
  private sequence = 1;
  private readonly dinrBalancesByParticipantId = new Map<string, number>();

  constructor(
    private readonly participants: ParticipantService,
    private readonly credentials: CredentialService,
    private readonly tokenisation: TokenisationService,
    private readonly repository = new SettlementRepository()
  ) {}

  mintDinr(input: MintDinrInput): DinrBalanceView {
    if (input.amount <= 0) {
      throw new Error("dINR mint amount must be positive");
    }

    const treasuryCredential = this.credentials.verifyCredential({
      credentialId: input.treasuryCredentialId,
      requiredRole: "NETWORK_ADMIN",
      accountAddress: input.treasuryAccount,
      at: input.submittedAt
    });
    if (!treasuryCredential.valid) {
      throw new Error(`Treasury credential invalid: ${treasuryCredential.reason}`);
    }
    if (treasuryCredential.credential?.participantId !== input.treasuryParticipantId) {
      throw new Error(`Treasury credential does not belong to participant: ${input.treasuryParticipantId}`);
    }

    this.requireActiveParticipant(input.participantId);
    const current = this.dinrBalancesByParticipantId.get(input.participantId) ?? 0;
    this.dinrBalancesByParticipantId.set(input.participantId, current + input.amount);
    return this.getDinrBalance(input.participantId);
  }

  createSettlement(input: CreateSettlementInput): SettlementRecord {
    const token = this.tokenisation.getTokenisedAssetByAssetId(input.assetId);
    if (!token) {
      throw new Error(`Asset is not tokenised: ${input.assetId}`);
    }
    if (token.tokenId !== input.tokenId) {
      throw new Error(`Token ID does not match asset: ${input.tokenId}`);
    }
    if (input.quantity <= 0 || input.unitPrice <= 0) {
      throw new Error("Settlement quantity and unit price must be positive");
    }
    const sellerBalance = token.holderBalances[input.sellerParticipantId] ?? 0;
    const sellerLocked = token.lockedBalances[input.sellerParticipantId] ?? 0;
    if (sellerBalance - sellerLocked < input.quantity) {
      throw new Error(`Seller does not hold enough unlocked asset units: ${input.sellerParticipantId}`);
    }

    this.requireActiveParticipant(input.sellerParticipantId);
    this.requireActiveParticipant(input.buyerParticipantId);
    this.requireRole(input.sellerParticipantId, "RECOVERY_ORIGINATOR", input.submittedAt);
    this.requireRole(input.buyerParticipantId, "BUYER", input.submittedAt);

    const createdAt = input.submittedAt ?? new Date().toISOString();
    const settlementId = input.settlementId ?? this.nextSettlementId();
    if (this.repository.get(settlementId)) {
      throw new Error(`Settlement already exists: ${settlementId}`);
    }

    const record: SettlementRecord = {
      schemaVersion: "1.0",
      settlementId,
      contractId: input.contractId,
      assetId: input.assetId,
      tokenId: input.tokenId,
      sellerParticipantId: input.sellerParticipantId,
      buyerParticipantId: input.buyerParticipantId,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      paymentAmount: input.quantity * input.unitPrice,
      currencyToken: "dINR",
      settlementType: input.settlementType ?? "SIMPLE_DVP",
      requiredAttestationType: input.requiredAttestationType,
      state: "CREATED",
      expiry: input.expiry,
      dinrLeg: {
        participantId: input.buyerParticipantId,
        amount: input.quantity * input.unitPrice,
        status: "PENDING"
      },
      assetLeg: {
        assetId: input.assetId,
        tokenId: input.tokenId,
        sellerParticipantId: input.sellerParticipantId,
        buyerParticipantId: input.buyerParticipantId,
        quantity: input.quantity,
        unit: "kg",
        status: "PENDING"
      },
      transactions: [],
      dependencyMode: "LOCAL_MOCK",
      createdAt,
      updatedAt: createdAt
    };

    record.transactions.push(
      this.transaction("SETTLEMENT_CREATED", record, input.chainId, input.contractAddress, createdAt)
    );
    return this.repository.save(record);
  }

  fundSettlement(input: FundSettlementInput): SettlementRecord {
    const settlement = this.repository.require(input.settlementId);
    this.requireOpen(settlement, input.submittedAt);
    if (input.buyerParticipantId !== settlement.buyerParticipantId) {
      throw new Error(`Only the buyer can fund settlement: ${settlement.settlementId}`);
    }
    this.requireRole(input.buyerParticipantId, "BUYER", input.submittedAt, input.buyerAccount);

    const amount = input.amount ?? settlement.paymentAmount;
    if (amount !== settlement.paymentAmount) {
      throw new Error(`Funding amount must equal settlement payment amount: ${settlement.paymentAmount}`);
    }

    const buyerBalance = this.dinrBalancesByParticipantId.get(settlement.buyerParticipantId) ?? 0;
    if (buyerBalance < amount) {
      throw new Error(`Insufficient dINR for buyer: ${settlement.buyerParticipantId}`);
    }

    this.dinrBalancesByParticipantId.set(settlement.buyerParticipantId, buyerBalance - amount);
    settlement.dinrLeg = {
      ...settlement.dinrLeg,
      accountAddress: input.buyerAccount,
      status: "LOCKED",
      txHash: this.transactionHash("DINR_FUNDED", settlement, input.submittedAt)
    };
    settlement.transactions.push(
      this.transaction("DINR_FUNDED", settlement, input.chainId, input.contractAddress, input.submittedAt)
    );
    this.updateReadyState(settlement, input.submittedAt);
    return this.repository.save(settlement);
  }

  lockAsset(input: LockAssetInput): SettlementRecord {
    const settlement = this.repository.require(input.settlementId);
    this.requireOpen(settlement, input.submittedAt);
    if (input.sellerParticipantId !== settlement.sellerParticipantId) {
      throw new Error(`Only the seller can lock settlement asset: ${settlement.settlementId}`);
    }
    this.requireRole(input.sellerParticipantId, "RECOVERY_ORIGINATOR", input.submittedAt, input.sellerAccount);

    const token = this.requireToken(settlement);
    const sellerBalance = token.holderBalances[settlement.sellerParticipantId] ?? 0;
    const sellerLocked = token.lockedBalances[settlement.sellerParticipantId] ?? 0;
    if (sellerBalance - sellerLocked < settlement.quantity) {
      throw new Error(`Insufficient unlocked asset units for seller: ${settlement.sellerParticipantId}`);
    }

    token.lockedBalances[settlement.sellerParticipantId] = sellerLocked + settlement.quantity;
    settlement.assetLeg = {
      ...settlement.assetLeg,
      status: "LOCKED",
      txHash: this.transactionHash("ASSET_LOCKED", settlement, input.submittedAt)
    };
    settlement.transactions.push(
      this.transaction("ASSET_LOCKED", settlement, input.chainId, input.contractAddress, input.submittedAt)
    );
    this.updateReadyState(settlement, input.submittedAt);
    return this.repository.save(settlement);
  }

  evaluateSettlement(settlementId: string, evaluatedAt = new Date().toISOString()): SettlementRecord {
    const settlement = this.repository.require(settlementId);
    this.requireOpen(settlement, evaluatedAt);
    this.updateReadyState(settlement, evaluatedAt);
    settlement.transactions.push(this.transaction("SETTLEMENT_EVALUATED", settlement, undefined, undefined, evaluatedAt));
    return this.repository.save(settlement);
  }

  settle(input: SettlementActionInput): SettlementRecord {
    const settlement = this.repository.require(input.settlementId);
    this.requireOpen(settlement, input.submittedAt);
    if (![settlement.buyerParticipantId, settlement.sellerParticipantId].includes(input.actorParticipantId)) {
      throw new Error(`Only settlement parties can settle: ${settlement.settlementId}`);
    }
    this.updateReadyState(settlement, input.submittedAt);
    if (settlement.state !== "READY") {
      throw new Error(`Settlement is not ready: ${settlement.settlementId}`);
    }

    const token = this.requireToken(settlement);
    token.lockedBalances[settlement.sellerParticipantId] =
      (token.lockedBalances[settlement.sellerParticipantId] ?? 0) - settlement.quantity;
    token.holderBalances[settlement.sellerParticipantId] =
      (token.holderBalances[settlement.sellerParticipantId] ?? 0) - settlement.quantity;
    token.holderBalances[settlement.buyerParticipantId] =
      (token.holderBalances[settlement.buyerParticipantId] ?? 0) + settlement.quantity;

    const sellerBalance = this.dinrBalancesByParticipantId.get(settlement.sellerParticipantId) ?? 0;
    this.dinrBalancesByParticipantId.set(settlement.sellerParticipantId, sellerBalance + settlement.paymentAmount);

    settlement.state = "SETTLED";
    settlement.dinrLeg.status = "RELEASED";
    settlement.assetLeg.status = "TRANSFERRED";
    settlement.updatedAt = input.submittedAt ?? new Date().toISOString();
    settlement.transactions.push(
      this.transaction("SETTLEMENT_SETTLED", settlement, input.chainId, input.contractAddress, input.submittedAt)
    );
    return this.repository.save(settlement);
  }

  refund(input: SettlementActionInput): SettlementRecord {
    const settlement = this.repository.require(input.settlementId);
    if (settlement.state === "SETTLED" || settlement.state === "REFUNDED") {
      throw new Error(`Settlement cannot be refunded from state: ${settlement.state}`);
    }
    if (![settlement.buyerParticipantId, settlement.sellerParticipantId].includes(input.actorParticipantId)) {
      throw new Error(`Only settlement parties can refund: ${settlement.settlementId}`);
    }

    const token = this.requireToken(settlement);
    if (settlement.assetLeg.status === "LOCKED") {
      token.lockedBalances[settlement.sellerParticipantId] =
        (token.lockedBalances[settlement.sellerParticipantId] ?? 0) - settlement.quantity;
      settlement.assetLeg.status = "UNLOCKED";
    }
    if (settlement.dinrLeg.status === "LOCKED") {
      const buyerBalance = this.dinrBalancesByParticipantId.get(settlement.buyerParticipantId) ?? 0;
      this.dinrBalancesByParticipantId.set(settlement.buyerParticipantId, buyerBalance + settlement.paymentAmount);
      settlement.dinrLeg.status = "REFUNDED";
    }

    settlement.state = "REFUNDED";
    settlement.updatedAt = input.submittedAt ?? new Date().toISOString();
    settlement.transactions.push(
      this.transaction("SETTLEMENT_REFUNDED", settlement, input.chainId, input.contractAddress, input.submittedAt)
    );
    return this.repository.save(settlement);
  }

  getSettlement(settlementId: string): SettlementRecord {
    return this.repository.require(settlementId);
  }

  listSettlements(): SettlementRecord[] {
    return this.repository.list();
  }

  getDinrBalance(participantId: string): DinrBalanceView {
    return {
      participantId,
      balance: this.dinrBalancesByParticipantId.get(participantId) ?? 0,
      currencyToken: "dINR",
      dependencyMode: "LOCAL_MOCK"
    };
  }

  private updateReadyState(settlement: SettlementRecord, updatedAt = new Date().toISOString()): SettlementState {
    if (settlement.dinrLeg.status === "LOCKED" && settlement.assetLeg.status === "LOCKED") {
      settlement.state = "READY";
    } else if (settlement.dinrLeg.status === "LOCKED") {
      settlement.state = "FUNDED";
    } else if (settlement.assetLeg.status === "LOCKED") {
      settlement.state = "ASSET_LOCKED";
    } else {
      settlement.state = "CREATED";
    }
    settlement.updatedAt = updatedAt;
    return settlement.state;
  }

  private requireOpen(settlement: SettlementRecord, checkedAt = new Date().toISOString()): void {
    if (settlement.state === "SETTLED" || settlement.state === "REFUNDED" || settlement.state === "EXPIRED") {
      throw new Error(`Settlement is closed: ${settlement.state}`);
    }
    if (new Date(checkedAt).getTime() > new Date(settlement.expiry).getTime()) {
      settlement.state = "EXPIRED";
      settlement.updatedAt = checkedAt;
      settlement.transactions.push(this.transaction("SETTLEMENT_EXPIRED", settlement, undefined, undefined, checkedAt));
      throw new Error(`Settlement expired: ${settlement.settlementId}`);
    }
  }

  private requireActiveParticipant(participantId: string): void {
    const participant = this.participants.getParticipant(participantId);
    if (!participant || participant.status !== "ACTIVE") {
      throw new Error(`Participant is not active: ${participantId}`);
    }
  }

  private requireRole(
    participantId: string,
    role: "BUYER" | "RECOVERY_ORIGINATOR",
    at?: string,
    accountAddress?: string
  ): void {
    const participant = this.participants.getParticipant(participantId);
    const credential = participant?.credentialIds
      .map((credentialId) => this.credentials.verifyCredential({ credentialId, requiredRole: role, at, accountAddress }))
      .find((result) => result.valid);
    if (!credential) {
      throw new Error(`Participant lacks active ${role} credential: ${participantId}`);
    }
  }

  private requireToken(settlement: SettlementRecord) {
    const token = this.tokenisation.getTokenisedAssetByAssetId(settlement.assetId);
    if (!token || token.tokenId !== settlement.tokenId) {
      throw new Error(`Tokenised asset not found for settlement: ${settlement.settlementId}`);
    }
    return token;
  }

  private transaction(
    type: SettlementTransactionType,
    settlement: SettlementRecord,
    chainId = DEFAULT_CHAIN_ID,
    contractAddress = DEFAULT_SETTLEMENT_CONTRACT,
    submittedAt = new Date().toISOString()
  ): SimulatedSettlementTransaction {
    return {
      dependencyMode: "LOCAL_MOCK",
      type,
      status: "SUBMITTED",
      chainId,
      contractAddress,
      txHash: this.transactionHash(type, settlement, submittedAt),
      submittedAt
    };
  }

  private transactionHash(type: SettlementTransactionType, settlement: SettlementRecord, submittedAt = new Date().toISOString()): string {
    return sha256CanonicalJson({
      kind: type,
      settlementId: settlement.settlementId,
      contractId: settlement.contractId,
      assetId: settlement.assetId,
      tokenId: settlement.tokenId,
      buyerParticipantId: settlement.buyerParticipantId,
      sellerParticipantId: settlement.sellerParticipantId,
      quantity: settlement.quantity,
      paymentAmount: settlement.paymentAmount,
      submittedAt
    } as CanonicalJsonValue);
  }

  private nextSettlementId(): string {
    return `STL-${String(this.sequence++).padStart(6, "0")}`;
  }
}
