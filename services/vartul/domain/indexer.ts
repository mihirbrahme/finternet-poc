import type { Chain } from "../chain/chain.js";
import type { Actors } from "./actors.js";
import type { Store } from "./store.js";
import { kg } from "../lib/util.js";

export const lotStates = [
  "NONE", "MINTED", "IN_TRANSIT", "RECEIVED", "VERIFIED", "CHALLENGED", "SETTLED", "REJECTED", "UNDER_REVIEW", "VOIDED",
] as const;
export const programmeStates = ["NONE", "PROPOSED", "ACTIVE", "COMPLETED", "DISPUTED", "EXPIRED", "RESOLVED", "CANCELLED"] as const;
export const claimTypes = ["", "FUNDED_RECOVERY", "EPR_READY_SUPPLY", "OBP_READY_RECOVERY", "PROCESSING_CONFIRMED"] as const;
export const claimStatuses = ["NONE", "VALID", "CONTESTED", "REVOKED"] as const;

export interface IndexedEvent {
  block: number;
  tx: string;
  logIndex: number;
  at: number;
  contract: string;
  event: string;
  args: Record<string, string | boolean | string[]>;
}

export interface LotProjection {
  id: string;
  code: string;
  programmeId: string;
  originator: string;
  state: (typeof lotStates)[number];
  stateBeforeReview: string;
  inputGrams: number;
  contaminationGrams: number;
  aggregatedGrams: number;
  receivedGrams: number;
  eligibleGrams: number;
  processedGrams: number;
  receiver: string;
  mintedAt: number;
  windowStart: number;
  windowEnd: number;
  challengeDeadline: number;
  proofRoot: string;
  attestations: { aggregation: string; dispatch: string; receipt: string; verification: string };
  contributions: { account: string; saathi: string; grams: number; excluded: number }[];
  holders: Record<string, number>;
  claims: number[];
}

export interface ProgrammeProjection {
  id: string;
  code: string;
  status: (typeof programmeStates)[number];
  originator: string;
  verifier: string;
  leadSponsor: string;
  policy: number;
  milestones: number;
  collectorBps: number;
  verifierBps: number;
  challengeWindow: number;
  deadline: number;
  grace: number;
  commitmentTime: number;
  targetGrams: number;
  ratePerKgInr: number;
  budgetInr: number;
  fundedInr: number;
  paidInr: number;
  refundedInr: number;
  acceptedGrams: number;
  settledGrams: number;
  sponsors: { account: string; participant: string; shareInr: number }[];
  pendingLots: string[];
  termsHash: string;
}

export interface ClaimProjection {
  id: number;
  type: (typeof claimTypes)[number];
  holder: string;
  holderParticipant: string;
  lotId: string;
  lotCode: string;
  grams: number;
  programmeId: string;
  issuedAt: number;
  status: (typeof claimStatuses)[number];
  disclosures: string[];
}

export interface AttestationProjection {
  id: string;
  kind: string;
  subject: string;
  attester: string;
  participant: string;
  quantity: string;
  evidence: string;
  ref: string;
  at: number;
  tx: string;
  revoked?: { at: number; by: string; reason: string; tx: string };
}

const inr = (v: unknown) => Number(BigInt(v as bigint) / 10n ** 14n) / 10_000;
const num = (v: unknown) => Number(v as bigint);

/** Rebuilds every projection from ledger logs and contract views. Nothing here is authoritative. */
export class Indexer {
  events: IndexedEvent[] = [];
  lots = new Map<string, LotProjection>();
  programmes = new Map<string, ProgrammeProjection>();
  claims = new Map<number, ClaimProjection>();
  attestations = new Map<string, AttestationProjection>();
  balances = new Map<string, bigint>();
  totalSupply = 0n;
  lastBlock = -1;
  private blockTimes = new Map<number, number>();
  kindNames = new Map<string, string>();

  constructor(private chain: Chain, private actors: Actors, private store: () => Store) {}

  reset() {
    this.events = [];
    this.lots.clear();
    this.programmes.clear();
    this.claims.clear();
    this.attestations.clear();
    this.balances.clear();
    this.totalSupply = 0n;
    this.lastBlock = -1;
    this.blockTimes.clear();
  }

  /** Serialise the projections so a snapshot can restore them without replaying every log. */
  serialize(): string {
    return JSON.stringify(
      {
        events: this.events,
        lots: [...this.lots],
        programmes: [...this.programmes],
        claims: [...this.claims],
        attestations: [...this.attestations],
        balances: [...this.balances],
        totalSupply: this.totalSupply,
        lastBlock: this.lastBlock,
        blockTimes: [...this.blockTimes],
        kindNames: [...this.kindNames],
      },
      (_k, v) => (typeof v === "bigint" ? { $big: v.toString() } : v),
    );
  }

  restore(json: string) {
    const d = JSON.parse(json, (_k, v) => (v && typeof v === "object" && typeof v.$big === "string" ? BigInt(v.$big) : v));
    this.events = d.events;
    this.lots = new Map(d.lots);
    this.programmes = new Map(d.programmes);
    this.claims = new Map(d.claims);
    this.attestations = new Map(d.attestations);
    this.balances = new Map(d.balances);
    this.totalSupply = d.totalSupply;
    this.lastBlock = d.lastBlock;
    this.blockTimes = new Map(d.blockTimes);
    this.kindNames = new Map(d.kindNames);
  }

  lotCode(id: string) {
    const meta = Object.values(this.store().lots).find((l) => l.id === id);
    return meta?.code ?? id.slice(0, 10);
  }

  programmeCode(id: string) {
    const meta = Object.values(this.store().programmes).find((p) => p.id === id);
    return meta?.code ?? id.slice(0, 10);
  }

  participantCode(id: string) {
    return this.actors.participantByIdHex(id)?.code ?? id.slice(0, 10);
  }

  async sync() {
    const head = await this.chain.blockNumber();
    if (head <= this.lastBlock) return;
    const from = this.lastBlock + 1;
    const logs = await this.chain.getLogs(from, head);
    const blocks = [...new Set(logs.map((l) => l.blockNumber))].filter((b) => !this.blockTimes.has(b));
    const fetched = await Promise.all(blocks.map((b) => this.chain.provider.getBlock(b)));
    fetched.forEach((b) => b && this.blockTimes.set(b.number, b.timestamp));

    const touchedLots = new Set<string>();
    const touchedProgrammes = new Set<string>();
    const touchedClaims = new Set<number>();
    for (const log of logs) {
      const decoded = this.chain.decodeLog(log);
      if (!decoded) continue;
      const args: IndexedEvent["args"] = {};
      for (const [k, v] of Object.entries(decoded.args)) {
        args[k] = Array.isArray(v) ? v.map(String) : typeof v === "boolean" ? v : String(v);
      }
      const event: IndexedEvent = {
        block: log.blockNumber,
        tx: log.transactionHash,
        logIndex: log.index,
        at: this.blockTimes.get(log.blockNumber) ?? 0,
        contract: decoded.contract,
        event: decoded.event,
        args,
      };
      this.events.push(event);
      this.apply(event, touchedLots, touchedProgrammes, touchedClaims);
    }
    this.lastBlock = head;
    await this.refresh(touchedLots, touchedProgrammes, touchedClaims);
  }

  private apply(e: IndexedEvent, lots: Set<string>, programmes: Set<string>, claims: Set<number>) {
    const a = e.args;
    const lotHex = (v: string) => `0x${BigInt(v).toString(16).padStart(64, "0")}`;
    switch (`${e.contract}.${e.event}`) {
      case "SandboxINR.Transfer": {
        const value = BigInt(a.value as string);
        const from = (a.from as string).toLowerCase();
        const to = (a.to as string).toLowerCase();
        if (from === "0x0000000000000000000000000000000000000000") this.totalSupply += value;
        else this.balances.set(from, (this.balances.get(from) ?? 0n) - value);
        if (to === "0x0000000000000000000000000000000000000000") this.totalSupply -= value;
        else this.balances.set(to, (this.balances.get(to) ?? 0n) + value);
        break;
      }
      case "VartulAttestations.Attested":
        this.attestations.set(a.id as string, {
          id: a.id as string,
          kind: this.kindNames.get(a.kind as string) ?? (a.kind as string),
          subject: a.subject as string,
          attester: a.attester as string,
          participant: this.participantCode(a.participant as string),
          quantity: a.quantity as string,
          evidence: a.evidence as string,
          ref: a.ref as string,
          at: e.at,
          tx: e.tx,
        });
        break;
      case "VartulAttestations.Revoked": {
        const att = this.attestations.get(a.id as string);
        if (att) att.revoked = { at: e.at, by: a.by as string, reason: a.reason as string, tx: e.tx };
        for (const lot of this.lots.values()) {
          if (Object.values(lot.attestations).includes(a.id as string)) lots.add(lot.id);
        }
        break;
      }
      case "RecoveryLotRegistry.LotMinted":
      case "RecoveryLotRegistry.LotStateChanged":
      case "RecoveryLotRegistry.LotReceived":
      case "RecoveryLotRegistry.LotVerified":
      case "RecoveryLotRegistry.LotChallenged":
      case "RecoveryLotRegistry.CollectorExcluded":
      case "RecoveryLotRegistry.LotProcessed":
        lots.add(lotHex((a.lotId ?? a.id) as string));
        break;
      case "RecoveryLotRegistry.TransferSingle": {
        const id = lotHex(a.id as string);
        lots.add(id);
        break;
      }
      case "ProgrammeEscrow.LotAccepted":
        lots.add(lotHex(a.lotId as string));
        programmes.add(a.id as string);
        break;
      case "VartulClaims.ClaimAllocated":
      case "VartulClaims.ClaimRevoked":
        claims.add(Number(a.claimId));
        if (a.lotId) lots.add(lotHex(a.lotId as string));
        break;
      default:
        if (e.contract === "ProgrammeEscrow" && typeof a.id === "string") programmes.add(a.id);
    }
  }

  private async refresh(lotIds: Set<string>, programmeIds: Set<string>, claimIds: Set<number>) {
    const lotsC = this.chain.contract("RecoveryLotRegistry");
    const escrow = this.chain.contract("ProgrammeEscrow");
    const claimsC = this.chain.contract("VartulClaims");

    await Promise.all(
      [...lotIds].map(async (id) => {
        const [l, contrib, claimIdsOfLot] = await Promise.all([
          lotsC.getLot(BigInt(id)),
          lotsC.getContributions(BigInt(id)),
          claimsC.claimsOfLot(BigInt(id)),
        ]);
        const meta = Object.values(this.store().lots).find((m) => m.id === id);
        const holders: Record<string, number> = {};
        const candidates = new Set<string>([this.actors.treasury(this.participantCode(l.originator)).address]);
        if (meta?.sale) candidates.add(this.actors.treasury(meta.sale.buyer).address);
        await Promise.all(
          [...candidates].map(async (addr) => {
            const bal = num(await lotsC.balanceOf(addr, BigInt(id)));
            if (bal > 0) holders[this.actors.byAddr(addr)?.participant ?? addr] = bal;
          }),
        );
        const contributions = (contrib[0] as string[]).map((account, i) => ({
          account,
          saathi: this.actors.byAddr(account)?.key ?? account,
          grams: num(contrib[1][i]),
          excluded: num(contrib[2][i]),
        }));
        this.lots.set(id, {
          id,
          code: meta?.code ?? this.lotCode(id),
          programmeId: l.programmeId,
          originator: this.participantCode(l.originator),
          state: lotStates[Number(l.state)],
          stateBeforeReview: lotStates[Number(l.stateBeforeReview)],
          inputGrams: num(l.inputGrams),
          contaminationGrams: num(l.contaminationGrams),
          aggregatedGrams: num(l.aggregatedGrams),
          receivedGrams: num(l.receivedGrams),
          eligibleGrams: num(l.eligibleGrams),
          processedGrams: num(l.processedGrams),
          receiver: l.receiver,
          mintedAt: num(l.mintedAt),
          windowStart: num(l.windowStart),
          windowEnd: num(l.windowEnd),
          challengeDeadline: num(l.challengeDeadline),
          proofRoot: l.proofRoot,
          attestations: {
            aggregation: l.aggregationAtt,
            dispatch: l.dispatchAtt,
            receipt: l.receiptAtt,
            verification: l.verificationAtt,
          },
          contributions,
          holders,
          claims: (claimIdsOfLot as bigint[]).map(Number),
        });
        for (const c of claimIdsOfLot as bigint[]) claimIds.add(Number(c));
      }),
    );

    await Promise.all(
      [...programmeIds].map(async (id) => {
        const [p, sponsors, pending] = await Promise.all([escrow.getProgramme(id), escrow.sponsorsOf(id), escrow.pendingLotsOf(id)]);
        this.programmes.set(id, {
          id,
          code: this.programmeCode(id),
          status: programmeStates[Number(p.status)],
          originator: this.participantCode(p.originator),
          verifier: this.participantCode(p.verifier),
          leadSponsor: p.leadSponsor,
          policy: Number(p.policy),
          milestones: Number(p.milestones),
          collectorBps: Number(p.collectorBps),
          verifierBps: Number(p.verifierBps),
          challengeWindow: num(p.challengeWindow),
          deadline: num(p.deadline),
          grace: num(p.grace),
          commitmentTime: num(p.commitmentTime),
          targetGrams: num(p.targetGrams),
          ratePerKgInr: inr(p.ratePerKg),
          budgetInr: inr(p.budget),
          fundedInr: inr(p.funded),
          paidInr: inr(p.paid),
          refundedInr: inr(p.refunded),
          acceptedGrams: num(p.acceptedGrams),
          settledGrams: num(p.settledGrams),
          sponsors: (sponsors[0] as string[]).map((account, i) => ({
            account,
            participant: this.actors.byAddr(account)?.participant ?? account,
            shareInr: inr(sponsors[1][i]),
          })),
          pendingLots: (pending as bigint[]).map((x) => this.lotCode(`0x${x.toString(16).padStart(64, "0")}`)),
          termsHash: p.termsHash,
        });
      }),
    );

    // Claim status is derived from lot state, so re-read every claim of every touched lot.
    for (const id of lotIds) for (const c of this.lots.get(id)?.claims ?? []) claimIds.add(c);
    await Promise.all(
      [...claimIds].map(async (id) => {
        const [c, status, disclosures] = await Promise.all([
          claimsC.getClaim(id),
          claimsC.statusOf(id),
          claimsC.disclosuresOf(id),
        ]);
        const lotId = `0x${BigInt(c.lotId).toString(16).padStart(64, "0")}`;
        this.claims.set(id, {
          id,
          type: claimTypes[Number(c.claimType)],
          holder: c.holder,
          holderParticipant: this.actors.byAddr(c.holder)?.participant ?? c.holder,
          lotId,
          lotCode: this.lotCode(lotId),
          grams: num(c.grams),
          programmeId: c.programmeId,
          issuedAt: num(c.issuedAt),
          status: claimStatuses[Number(status)],
          disclosures: (disclosures as bigint[]).map((t) => claimTypes[Number(t)]),
        });
      }),
    );
  }

  balanceInr(address: string) {
    return inr(this.balances.get(address.toLowerCase()) ?? 0n);
  }

  eventsForTx(hash: string) {
    return this.events.filter((e) => e.tx === hash);
  }

  /** Network-level totals, all derived from ledger state. */
  totals() {
    const lots = [...this.lots.values()];
    const settled = lots.filter((l) => l.state === "SETTLED");
    const progs = [...this.programmes.values()];
    const collectorPaid = this.events
      .filter((e) => e.event === "CollectorPaid")
      .reduce((s, e) => s + inr(BigInt(e.args.amount as string)), 0);
    const released = progs.reduce((s, p) => s + p.paidInr, 0);
    const claims = [...this.claims.values()];
    const funded = claims.filter((c) => c.type === "FUNDED_RECOVERY");
    return {
      lots: lots.length,
      settledLots: settled.length,
      verifiedKg: kg(lots.filter((l) => ["VERIFIED", "SETTLED"].includes(l.state)).reduce((s, l) => s + l.eligibleGrams, 0)),
      aggregatedKg: kg(lots.reduce((s, l) => s + l.aggregatedGrams, 0)),
      programmes: progs.length,
      fundedInr: progs.reduce((s, p) => s + p.fundedInr, 0),
      releasedInr: released,
      collectorPaidInr: collectorPaid,
      lastMileShare: released ? collectorPaid / released : 0,
      claims: claims.length,
      fundedClaimKg: kg(funded.reduce((s, c) => s + c.grams, 0)),
      contestedClaims: claims.filter((c) => c.status === "CONTESTED").length,
      revokedClaims: claims.filter((c) => c.status === "REVOKED").length,
      transactions: new Set(this.events.map((e) => e.tx)).size,
      events: this.events.length,
      attestations: this.attestations.size,
      dinrSupply: inr(this.totalSupply),
    };
  }
}
