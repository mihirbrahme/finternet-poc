import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import { Chain, type ContractName, type SentTx } from "../chain/chain.js";
import {
  materials,
  participants,
  programmes as programmeSpecs,
  openOfferings,
  saathis,
  villages,
  sites,
  receivers,
  type Material,
  type ProgrammeSpec,
} from "../dataset/murud.js";
import { Actors, type Actor } from "./actors.js";
import { Indexer } from "./indexer.js";
import { AnomalyEngine } from "./anomalies.js";
import { CredentialService, didFor } from "../credentials/credentials.js";
import { photoHash, recordFingerprint, signRecord } from "./evidence.js";
import { emptyStore, type CollectionRecord, type Exclusion, type LotMeta, type Store } from "./store.js";
import { DomainError, fingerprint, idOf, isoOf, kg, merkle, rng, rupees, sha256, toUnix, wei } from "../lib/util.js";

export const kinds = {
  AGGREGATION_WEIGH: idOf("AGGREGATION_WEIGH"),
  DISPATCH: idOf("DISPATCH"),
  RECEIPT: idOf("RECEIPT"),
  VERIFICATION: idOf("VERIFICATION"),
  PROCESSING: idOf("PROCESSING"),
  RESOLUTION: idOf("RESOLUTION"),
  ARBITRAL_AWARD: idOf("ARBITRAL_AWARD"),
  PANCHAYAT_COSIGN: idOf("PANCHAYAT_COSIGN"),
};

const attestationTypes = {
  Attestation: [
    { name: "kind", type: "bytes32" },
    { name: "subject", type: "bytes32" },
    { name: "quantity", type: "uint256" },
    { name: "evidence", type: "bytes32" },
    { name: "ref", type: "bytes32" },
    { name: "issuedAt", type: "uint64" },
    { name: "nonce", type: "uint64" },
  ],
};

const lotPrefix: Record<string, string> = {
  "PRG-MRD-COASTAL-2026": "MRD",
  "PRG-MRD-BEACH-2026": "KSB",
  "PRG-ALB-SHORE-2026": "ALB",
  "PRG-SVD-VILLAGE-2026": "SVD",
  "PRG-MRD-NETS-2027": "MNT",
  "PRG-ALB-HAMLETS-2027": "AFH",
  "PRG-SVD-SCHOOLS-2027": "SSM",
};

const deadlineOf = (date: string) => toUnix(`${date}T18:29:59Z`);

/** The Vartul node: domain operations executed as signed transactions on the ledger. */
export class Vartul {
  store: Store = emptyStore();
  readonly actors = new Actors();
  readonly indexer: Indexer;
  readonly anomalies: AnomalyEngine;
  readonly credentials: CredentialService;
  /** Pinned clock used by the deterministic seeder; undefined in live operation. */
  clock?: number;
  scene?: string;

  constructor(readonly chain: Chain, public baseUrl: string) {
    this.indexer = new Indexer(chain, this.actors, () => this.store);
    for (const [name, id] of Object.entries(kinds)) this.indexer.kindNames.set(id, name);
    this.anomalies = new AnomalyEngine(() => this.store);
    this.credentials = new CredentialService(() => this.store, () => this.baseUrl);
  }

  async now() {
    return this.clock ?? (await this.chain.latestTimestamp());
  }

  // ---------------------------------------------------------------- transactions

  private async tx(actor: Actor, contract: ContractName, method: string, args: unknown[], action: string, subject?: string) {
    if (this.clock !== undefined) await this.chain.setNextTimestamp(this.clock);
    const sent = await this.chain.send(actor.wallet, contract, method, args);
    this.store.txs[sent.hash] = {
      hash: sent.hash,
      action,
      actor: actor.key,
      participant: actor.participant,
      at: sent.timestamp,
      block: sent.blockNumber,
      scene: this.scene,
      subject,
    };
    return sent;
  }

  /** A participant signs an EIP-712 attestation off-chain; the network relayer submits it. */
  private async attest(signer: Actor, kind: string, subject: string, quantity: bigint | number, ref: string, evidence?: string) {
    this.store.counters.nonce = (this.store.counters.nonce ?? 0) + 1;
    const a = {
      kind,
      subject,
      quantity: BigInt(quantity),
      evidence: evidence ?? keccak256(toUtf8Bytes(`evidence:${subject}:${kind}:${this.store.counters.nonce}`)),
      ref,
      issuedAt: BigInt(await this.now()),
      nonce: BigInt(this.store.counters.nonce),
    };
    const domain = { name: "Vartul", version: "1", chainId: 31337, verifyingContract: this.chain.addresses!.VartulAttestations };
    const signature = await signer.wallet.signTypedData(domain, attestationTypes, a);
    return { a, signature };
  }

  async sync() {
    await this.indexer.sync();
  }

  // ---------------------------------------------------------------- network bootstrap

  async bootstrapNetwork() {
    const fac = this.actors.facilitator;
    const relayer = this.actors.relayer;
    await this.chain.deploy(fac.wallet, (a) => ({
      VartulRegistry: [fac.address],
      VartulAttestations: [a.VartulRegistry],
      SandboxINR: [a.VartulRegistry, this.actors.issuer.address],
      RecoveryLotRegistry: [a.VartulRegistry, a.VartulAttestations],
      ProgrammeEscrow: [a.VartulRegistry, a.VartulAttestations, a.SandboxINR, a.RecoveryLotRegistry],
      PayoutRouter: [a.SandboxINR, a.RecoveryLotRegistry, a.ProgrammeEscrow],
      VartulClaims: [a.VartulRegistry, a.RecoveryLotRegistry],
      MaterialSettlement: [a.VartulRegistry, a.SandboxINR, a.RecoveryLotRegistry, a.VartulClaims],
    }));
    this.store.deployment = this.chain.addresses;
    const at = await this.now();

    for (const p of participants) {
      await this.tx(fac, "VartulRegistry", "setParticipant", [idOf(p.code), true, this.actors.treasury(p.code).address], `Register ${p.name}`, p.code);
      for (const a of p.accounts) {
        const actor = this.actors.get(a.key);
        await this.tx(fac, "VartulRegistry", "setAccount", [actor.address, idOf(p.code), actor.roleMask, 0, idOf(`credential:${a.key}`)], `Grant ${a.roles.join("+")} to ${a.label}`, p.code);
      }
      if (p.kind !== "payments") {
        await this.credentials.issue({
          kind: "VartulParticipantCredential",
          issuer: "VARTUL-NET",
          issuerName: "Vartul Network Facilitator (Suma)",
          subjectId: didFor(p.code),
          subject: {
            name: p.name,
            participantType: p.kind,
            roles: [...new Set(p.accounts.flatMap((a) => a.roles))],
            registrations: p.registrations,
            accounts: p.accounts.map((a) => ({ label: a.label, address: this.actors.get(a.key).address })),
            simulated: !p.real,
          },
          issuedAt: at,
          summary: { participant: p.code, name: p.name },
          id: `PC-${p.code}`,
        });
      }
    }
    for (const s of saathis) {
      const actor = this.actors.get(s.id);
      await this.tx(fac, "VartulRegistry", "setAccount", [actor.address, idOf(s.org), actor.roleMask, 0, idOf(`credential:${s.id}`)], `Onboard collector ${s.id}`, s.org);
    }
    for (const name of ["ProgrammeEscrow", "PayoutRouter", "MaterialSettlement"] as const) {
      await this.tx(fac, "VartulRegistry", "setSystemAccount", [this.chain.addresses![name], true], `Authorise ${name} to hold dINR`);
    }
    await this.tx(fac, "VartulAttestations", "setWriter", [this.chain.addresses!.RecoveryLotRegistry, true], "Authorise lot registry to record attestations");
    await this.tx(fac, "VartulAttestations", "setWriter", [this.chain.addresses!.ProgrammeEscrow, true], "Authorise escrow to record awards");
    await this.tx(fac, "VartulAttestations", "setStandaloneKind", [kinds.PANCHAYAT_COSIGN, 1n << 7n], "Allow Panchayat co-attestations");
    await this.tx(fac, "RecoveryLotRegistry", "wire", [this.chain.addresses!.ProgrammeEscrow, this.chain.addresses!.MaterialSettlement], "Wire lot registry");
    await this.tx(fac, "ProgrammeEscrow", "wire", [this.chain.addresses!.VartulClaims, this.chain.addresses!.PayoutRouter], "Wire escrow");
    await this.tx(fac, "VartulClaims", "setAllocator", [this.chain.addresses!.ProgrammeEscrow, true], "Authorise escrow to allocate claims");
    await this.tx(fac, "VartulClaims", "setAllocator", [this.chain.addresses!.MaterialSettlement, true], "Authorise material settlement to allocate claims");
    void relayer;

    const onRamp: [string, number][] = [
      ["TIDEWELL", 2_000_000], ["NEELKANTH", 1_500_000], ["COASTLINE", 800_000], ["TALVAN", 1_000_000], ["GHATMATHA", 500_000],
    ];
    for (const [code, amount] of onRamp) {
      await this.tx(this.actors.issuer, "SandboxINR", "mint", [this.actors.treasury(code).address, wei(amount)], `Sandbox on-ramp: ₹${amount.toLocaleString("en-IN")} to ${this.actors.participantName(code)}`, code);
    }
  }

  // ---------------------------------------------------------------- programmes

  specOf(code: string): ProgrammeSpec {
    const spec = [...programmeSpecs, ...openOfferings].find((p) => p.id === code) ?? this.store.programmes[code]?.spec;
    if (!spec) throw new DomainError(`Unknown programme ${code}`, 404);
    return spec;
  }

  termsDocument(spec: ProgrammeSpec, sponsors: { code: string; share: number }[]) {
    return {
      schema: "vartul:programme-terms/1.0",
      programme: spec.id,
      title: spec.title,
      originator: spec.originator,
      verifier: spec.verifier,
      sponsors,
      region: spec.region,
      materials: spec.materials,
      paymentPolicy: spec.policy,
      ratePerKgInr: spec.ratePerKg,
      targetKg: spec.targetKg,
      budgetInr: sponsors.reduce((s, x) => s + x.share, 0),
      milestones: spec.milestones,
      split: {
        collectorsBps: spec.collectorBps,
        verifierBps: spec.verifierBps,
        originatorBps: 10_000 - spec.collectorBps - spec.verifierBps,
      },
      challengeWindowHours: spec.challengeHours,
      eligibility: "Material collected after the originator's acceptance of these terms (additionality)",
      deadline: spec.deadline,
      graceDays: spec.graceDays,
      exceptions: "Any change requires every party's approval of the exact proposal; a new proposal supersedes earlier ones",
      disputes: "Pause settlement; resolve by agreement or by arbitral award recorded on the network",
      attribution: "Sponsors receive exclusive, non-transferable funded-recovery claims pro rata to funding; not material ownership, not offsets",
      sample: true,
    };
  }

  async proposeProgramme(spec: ProgrammeSpec, sponsors: { code: string; share: number }[]) {
    const id = idOf(spec.id);
    const terms = this.termsDocument(spec, sponsors);
    const termsHash = fingerprint(terms);
    this.store.programmes[spec.id] = { code: spec.id, id, spec: { ...spec, sponsors }, termsDocument: terms, termsHash };
    const lead = this.actors.account(sponsors[0].code, "SPONSOR");
    const input = {
      id,
      termsHash,
      originator: idOf(spec.originator),
      verifier: idOf(spec.verifier),
      material: idOf(spec.materials.join("+")),
      region: idOf(spec.region),
      policy: spec.policy === "FIXED_ON_TARGET" ? 1 : 2,
      milestones: spec.milestones,
      collectorBps: spec.collectorBps,
      verifierBps: spec.verifierBps,
      challengeWindow: spec.challengeHours * 3600,
      deadline: deadlineOf(spec.deadline),
      grace: spec.graceDays * 86400,
      targetGrams: spec.policy === "FIXED_ON_TARGET" ? spec.targetKg * 1000 : 0,
      ratePerKg: wei(spec.ratePerKg),
      sponsors: sponsors.map((s) => this.actors.account(s.code, "SPONSOR").address),
      shares: sponsors.map((s) => wei(s.share)),
    };
    return this.tx(lead, "ProgrammeEscrow", "propose", [input], `Propose programme “${spec.title}”`, spec.id);
  }

  async fundProgramme(code: string, sponsor: string) {
    const meta = this.programme(code);
    const share = meta.spec.sponsors.find((s) => s.code === sponsor)?.share;
    if (!share) throw new DomainError(`${sponsor} is not a sponsor of ${code}`);
    const actor = this.actors.account(sponsor, "SPONSOR");
    await this.tx(actor, "SandboxINR", "approve", [this.chain.addresses!.ProgrammeEscrow, wei(share)], `Approve escrow for ₹${share.toLocaleString("en-IN")}`, code);
    return this.tx(actor, "ProgrammeEscrow", "fund", [meta.id], `Fund ₹${share.toLocaleString("en-IN")} into programme escrow`, code);
  }

  async acceptProgramme(code: string) {
    const meta = this.programme(code);
    return this.tx(this.actors.account(meta.spec.originator, "ORIGINATOR"), "ProgrammeEscrow", "accept", [meta.id, meta.termsHash], `Accept exact terms ${meta.termsHash.slice(0, 10)}… (commitment)`, code);
  }

  programme(code: string) {
    const meta = this.store.programmes[code];
    if (!meta) throw new DomainError(`Programme ${code} not on the network`, 404);
    return meta;
  }

  // ---------------------------------------------------------------- field capture

  async captureRecord(input: {
    saathi: string;
    material: Material;
    grams: number;
    village?: string;
    route?: string;
    at?: number;
    lat?: number;
    lng?: number;
    photoSeed?: string;
    assisted?: boolean;
    cosign?: boolean;
  }): Promise<CollectionRecord> {
    const s = saathis.find((x) => x.id === input.saathi);
    if (!s) throw new DomainError(`Unknown collector ${input.saathi}`, 404);
    if (!(input.grams > 0 && input.grams <= 80_000)) throw new DomainError("Weight must be between 1 g and 80 kg per bag");
    const at = input.at ?? (await this.now());
    const villageCode = input.village ?? s.villages[0];
    const village = villages.find((v) => v.code === villageCode);
    const route = input.route ?? (village ? `${village.name} door-to-door route` : `${villageCode} route`);
    const anchor = route.includes("Korlai shore") ? sites.beaches[1] : route.includes("Kashid beach") ? sites.beaches[0] : village;
    this.store.counters.record = (this.store.counters.record ?? 0) + 1;
    const n = this.store.counters.record;
    const jitter = rng(n * 7919);
    const id = `CR-${s.org.slice(0, 3)}-${isoOf(at).slice(0, 10).replaceAll("-", "")}-${String(n).padStart(6, "0")}`;
    const photoSeed = input.photoSeed ?? keccak256(toUtf8Bytes(`photo:${id}`));
    const base = {
      id,
      saathi: s.id,
      org: s.org,
      village: villageCode,
      route,
      material: input.material,
      grams: Math.round(input.grams),
      capturedAt: at,
      lat: input.lat ?? (anchor ? anchor.lat + (jitter.next() - 0.5) * 0.008 : 18.3),
      lng: input.lng ?? (anchor ? anchor.lng + (jitter.next() - 0.5) * 0.008 : 72.9),
      gpsAccuracyM: jitter.int(4, 18),
      photoSeed,
      photoHash: photoHash(photoSeed, input.material),
      scale: `Route scale RS-${String((saathis.indexOf(s) % 12) + 1).padStart(2, "0")}`,
      assisted: input.assisted,
    };
    const fp = recordFingerprint(base);
    const record: CollectionRecord = {
      ...base,
      fingerprint: fp,
      deviceSignature: await signRecord(this.actors.get(s.id).wallet, fp),
      syncedAt: at + 3600,
    };
    if (input.cosign !== false && s.org === "AAMHI") {
      record.supervisorSignature = await signRecord(this.actors.get("AAMHI:SUPERVISOR").wallet, fp);
    }
    this.store.records[id] = record;
    return record;
  }

  availableRecords(org: string, material?: Material) {
    return Object.values(this.store.records).filter((r) => r.org === org && !r.lot && (!material || r.material === material));
  }

  /** Next free lot code for a programme stream. Numbers are only consumed by successful mints. */
  nextLotCode(programme: string) {
    const prefix = lotPrefix[programme] ?? "GEN";
    let n = (this.store.counters[`lot:${prefix}`] ?? 0) + 1;
    while (this.store.lots[`VRL-${prefix}-2026-${String(n).padStart(4, "0")}`]) n++;
    return `VRL-${prefix}-2026-${String(n).padStart(4, "0")}`;
  }

  // ---------------------------------------------------------------- lot lifecycle

  lot(code: string): LotMeta {
    const meta = this.store.lots[code];
    if (!meta) throw new DomainError(`Unknown lot ${code}`, 404);
    return meta;
  }

  async mintLot(input: {
    code?: string;
    programme: string;
    material: Material;
    recordIds: string[];
    contaminationGrams: number;
    aggregatedGrams: number;
  }) {
    const prog = this.programme(input.programme);
    const code = input.code ?? this.nextLotCode(input.programme);
    if (this.store.lots[code]) throw new DomainError(`Lot ${code} already exists`);
    const records = input.recordIds.map((id) => {
      const r = this.store.records[id];
      if (!r) throw new DomainError(`Unknown record ${id}`, 404);
      if (r.lot) throw new DomainError(`Record ${id} is already in lot ${r.lot}`);
      if (r.org !== prog.spec.originator) throw new DomainError(`Record ${id} belongs to another organisation`);
      return r;
    });
    if (!records.length) throw new DomainError("A lot needs at least one collection record");
    const bySaathi = new Map<string, number>();
    for (const r of records) bySaathi.set(r.saathi, (bySaathi.get(r.saathi) ?? 0) + r.grams);
    const inputGrams = records.reduce((s, r) => s + r.grams, 0);
    const tree = merkle(records.map((r) => r.fingerprint));
    const id = idOf(code);
    const mrc = this.actors.account(prog.spec.originator, "MRC_OPERATOR");
    const windowStart = Math.min(...records.map((r) => r.capturedAt));
    const windowEnd = Math.max(...records.map((r) => r.capturedAt));
    const bale = `BALE-${code.slice(4)}`;
    const { a, signature } = await this.attest(mrc, kinds.AGGREGATION_WEIGH, id, input.aggregatedGrams, tree.root, sha256(`${bale}:${input.aggregatedGrams}`).slice(0, 66));
    const m = {
      lotId: id,
      programmeId: prog.id,
      milestone: 1,
      material: idOf(input.material),
      region: idOf(prog.spec.region),
      windowStart,
      windowEnd,
      inputGrams,
      contaminationGrams: input.contaminationGrams,
      aggregatedGrams: input.aggregatedGrams,
      collectors: [...bySaathi.keys()].map((k) => this.actors.get(k).address),
      collectorGrams: [...bySaathi.values()],
    };
    const sent = await this.tx(this.actors.relayer, "RecoveryLotRegistry", "mintLot", [m, a, signature],
      `Weigh ${kg(input.aggregatedGrams).toLocaleString("en-IN")} kg ${materials[input.material].label} at MRC and mint ${code}`, code);
    for (const r of records) r.lot = code;
    const prefix = lotPrefix[input.programme] ?? "GEN";
    const n = Number(code.slice(-4));
    if (code.startsWith(`VRL-${prefix}-`) && n > (this.store.counters[`lot:${prefix}`] ?? 0)) this.store.counters[`lot:${prefix}`] = n;
    this.store.lots[code] = {
      code,
      id,
      programme: input.programme,
      originator: prog.spec.originator,
      material: input.material,
      records: records.map((r) => r.id),
      villages: [...new Set(records.map((r) => r.village))],
      inputGrams,
      contaminationGrams: input.contaminationGrams,
      aggregatedGrams: input.aggregatedGrams,
      windowStart,
      windowEnd,
      proofRoot: tree.root,
      bale,
    };
    return { sent, code };
  }

  async dispatch(code: string, receiver?: string) {
    const lot = this.lot(code);
    const recv = receiver ?? receivers[lot.material];
    const facility = this.actors.account(recv, "FACILITY");
    const vehicle = `MH-06-${["AB", "BK", "CT"][parseInt(lot.id.slice(2, 4), 16) % 3]}-${1000 + (parseInt(lot.id.slice(4, 8), 16) % 9000)}`;
    const document = `TD-${code.slice(4)}`;
    const docHash = sha256(`${document}:${vehicle}:${lot.aggregatedGrams}`);
    const { a, signature } = await this.attest(this.actors.account(lot.originator, "ORIGINATOR"), kinds.DISPATCH, lot.id, lot.aggregatedGrams, docHash);
    const sent = await this.tx(this.actors.relayer, "RecoveryLotRegistry", "dispatch", [BigInt(lot.id), facility.address, a, signature],
      `Dispatch ${code} to ${this.actors.participantName(recv)} (vehicle ${vehicle})`, code);
    lot.receiver = recv;
    lot.transportDoc = { vehicle, document, hash: docHash };
    return sent;
  }

  async confirmReceipt(code: string, grams: number) {
    const lot = this.lot(code);
    if (!lot.receiver) throw new DomainError(`${code} has not been dispatched`);
    const slip = `WB-${lot.receiver.slice(0, 3)}-${code.slice(-4)}`;
    const hash = sha256(`${slip}:${grams}`);
    const { a, signature } = await this.attest(this.actors.account(lot.receiver, "FACILITY"), kinds.RECEIPT, lot.id, grams, hash);
    const sent = await this.tx(this.actors.relayer, "RecoveryLotRegistry", "confirmReceipt", [BigInt(lot.id), a, signature],
      `${this.actors.participantName(lot.receiver)} weighbridge receipt: ${kg(grams).toLocaleString("en-IN")} kg`, code);
    lot.weighSlip = { slip, grams, hash };
    return sent;
  }

  async verifyLot(code: string, input: { eligibleGrams: number; excluded?: Exclusion[]; notes?: string; sampled?: string[] }) {
    const lot = this.lot(code);
    const prog = this.programme(lot.programme);
    const verifier = this.actors.account(prog.spec.verifier, "VERIFIER");
    const excluded = input.excluded ?? [];
    const sampled = input.sampled ?? this.anomalies.samplingPlan(lot).map((p) => p.record);
    const report = {
      lot: code,
      verifier: prog.spec.verifier,
      sampled,
      excluded,
      eligibleGrams: input.eligibleGrams,
      methodology: "Vartul verification standard v1: proof-chain review, risk-weighted sampling, MRC log and weighbridge reconciliation",
      notes: input.notes ?? "Proof chain complete; sampled records consistent with MRC log and weighbridge slip.",
    };
    const reportHash = fingerprint(report);
    const { a, signature } = await this.attest(verifier, kinds.VERIFICATION, lot.id, input.eligibleGrams, reportHash);
    const exclusions = excluded.map((e) => ({ collector: this.actors.get(e.saathi).address, grams: e.grams }));
    const sent = await this.tx(this.actors.relayer, "RecoveryLotRegistry", "verify", [BigInt(lot.id), exclusions, a, signature],
      input.eligibleGrams === 0 ? `${this.actors.participantName(prog.spec.verifier)} rejects ${code}` : `${this.actors.participantName(prog.spec.verifier)} verifies ${kg(input.eligibleGrams).toLocaleString("en-IN")} kg eligible in ${code}`, code);
    lot.verification = { sampled, excluded, eligibleGrams: input.eligibleGrams, report: `VR-${code.slice(4)}`, reportHash, notes: report.notes };
    await this.credentials.issue({
      kind: "RecoveryVerificationCredential",
      issuer: prog.spec.verifier,
      issuerName: this.actors.participantName(prog.spec.verifier),
      subjectId: `urn:vartul:lot:${code}`,
      subject: {
        lot: code,
        programme: lot.programme,
        material: lot.material,
        receivedKg: kg(lot.weighSlip?.grams ?? 0),
        eligibleKg: kg(input.eligibleGrams),
        excludedKg: kg(excluded.reduce((s, e) => s + e.grams, 0)),
        sampledRecords: sampled.length,
        reportFingerprint: reportHash,
        ledgerTransaction: sent.hash,
      },
      issuedAt: sent.timestamp,
      summary: { lot: code, eligibleKg: kg(input.eligibleGrams) },
      id: `VR-${code.slice(4)}`,
    });
    await this.afterSettlement(sent);
    return sent;
  }

  async challengeLot(code: string, byKey: string, reason: string) {
    const lot = this.lot(code);
    const by = this.actors.get(byKey);
    const sent = await this.tx(by, "RecoveryLotRegistry", "challenge", [BigInt(lot.id), keccak256(toUtf8Bytes(reason))], `Challenge ${code}: ${reason}`, code);
    lot.challenge = { by: by.participant, reason, at: sent.timestamp };
    return sent;
  }

  async resolveChallenge(code: string, grams: number, resolution: string) {
    const lot = this.lot(code);
    const prog = this.programme(lot.programme);
    const { a, signature } = await this.attest(this.actors.account(prog.spec.verifier, "VERIFIER"), kinds.RESOLUTION, lot.id, grams, fingerprint({ code, resolution, grams }));
    const sent = await this.tx(this.actors.relayer, "RecoveryLotRegistry", "resolveChallenge", [BigInt(lot.id), a, signature], `Resolve challenge on ${code}: ${kg(grams)} kg eligible`, code);
    if (lot.challenge) lot.challenge.resolution = resolution;
    if (lot.verification) lot.verification.eligibleGrams = grams;
    await this.afterSettlement(sent);
    return sent;
  }

  async finalizeLot(code: string) {
    const lot = this.lot(code);
    const sent = await this.tx(this.actors.relayer, "RecoveryLotRegistry", "finalize", [BigInt(lot.id)], `Finalise ${code} after challenge window`, code);
    await this.afterSettlement(sent);
    return sent;
  }

  async sellLot(code: string, buyer: string, priceInr?: number) {
    const lot = this.lot(code);
    const price = priceInr ?? Math.round(kg(lot.verification?.eligibleGrams ?? lot.aggregatedGrams) * materials[lot.material].pricePerKg);
    const seller = this.actors.account(lot.originator, "ORIGINATOR");
    const buyerActor = this.actors.account(buyer, "BUYER");
    const expires = (await this.now()) + 7 * 86400;
    const offerSent = await this.tx(seller, "MaterialSettlement", "createOffer", [BigInt(lot.id), buyerActor.address, wei(price), expires], `Offer ${code} material to ${this.actors.participantName(buyer)} at ₹${price.toLocaleString("en-IN")}`, code);
    const offerLog = offerSent.logs.map((l) => this.chain.decodeLog(l)).find((d) => d?.event === "OfferCreated");
    const offerId = Number(offerLog!.args.offerId);
    await this.tx(buyerActor, "SandboxINR", "approve", [this.chain.addresses!.MaterialSettlement, wei(price)], `Approve ₹${price.toLocaleString("en-IN")} for delivery-versus-payment`, code);
    const sent = await this.tx(buyerActor, "MaterialSettlement", "acceptOffer", [offerId], `Delivery versus payment: ${this.actors.participantName(buyer)} buys ${code}`, code);
    lot.sale = { buyer, priceInr: price, offerId };
    await this.afterSettlement(sent);
    return sent;
  }

  async recordProcessing(code: string, grams: number) {
    const lot = this.lot(code);
    const { a, signature } = await this.attest(this.actors.account(lot.receiver!, "FACILITY"), kinds.PROCESSING, lot.id, grams, fingerprint({ code, grams, process: "wash-shred-extrude" }));
    return this.tx(this.actors.relayer, "RecoveryLotRegistry", "recordProcessing", [BigInt(lot.id), a, signature], `Processing attested for ${code}: ${kg(grams)} kg output`, code);
  }

  /** Revoke an attestation (facilitator, acting on a finding) and place every dependent lot under review. */
  async revokeAttestation(attestationId: string, reason: string) {
    const sent = await this.tx(this.actors.facilitator, "VartulAttestations", "revoke", [attestationId, keccak256(toUtf8Bytes(reason))], `Revoke attestation ${attestationId.slice(0, 10)}…: ${reason}`);
    await this.sync();
    const affected = [...this.indexer.lots.values()].filter((l) => Object.values(l.attestations).includes(attestationId));
    for (const l of affected) {
      if (["UNDER_REVIEW", "VOIDED", "NONE"].includes(l.state)) continue;
      await this.tx(this.actors.relayer, "RecoveryLotRegistry", "markUnderReview", [BigInt(l.id)], `Revocation cascade: ${l.code} under review`, l.code);
      const meta = this.store.lots[l.code];
      if (meta) meta.review = { reason, at: sent.timestamp };
    }
    return { sent, affected: affected.map((l) => l.code) };
  }

  async concludeReview(code: string, voidLot: boolean, outcome: string) {
    const lot = this.lot(code);
    const { a, signature } = await this.attest(this.actors.facilitator, kinds.RESOLUTION, lot.id, 0, fingerprint({ code, outcome, voidLot }));
    const sent = await this.tx(this.actors.facilitator, "RecoveryLotRegistry", "concludeReview", [BigInt(lot.id), voidLot, a, signature], `${voidLot ? "Void" : "Restore"} ${code} after review`, code);
    if (lot.review) lot.review.outcome = outcome;
    if (voidLot) {
      for (const c of Object.values(this.store.credentials)) {
        if (c.type === "FundedRecoveryCertificate" && c.summary.lot === code) this.credentials.revoke(c.id);
      }
    }
    return sent;
  }

  // ---------------------------------------------------------------- exceptions, disputes, awards

  async proposeException(programme: string, byKey: string, input: { kind: "SETTLE" | "EXTEND" | "RESUME"; amountInr?: number; newDeadline?: string; reason: string; evidence?: string[] }) {
    const meta = this.programme(programme);
    const by = this.actors.get(byKey);
    const kind = { SETTLE: 1, EXTEND: 2, RESUME: 3 }[input.kind];
    const newDeadline = input.newDeadline ? deadlineOf(input.newDeadline) : 0;
    const reasonHash = fingerprint({ reason: input.reason, evidence: input.evidence ?? [] });
    const sent = await this.tx(by, "ProgrammeEscrow", "proposeException", [meta.id, kind, wei(input.amountInr ?? 0), newDeadline, reasonHash],
      `Propose ${input.kind.toLowerCase()} exception${input.amountInr ? ` of ₹${input.amountInr.toLocaleString("en-IN")}` : ""}: ${input.reason}`, programme);
    const log = sent.logs.map((l) => this.chain.decodeLog(l)).find((d) => d?.event === "ExceptionProposed");
    const hash = log!.args.hash as string;
    for (const e of Object.values(this.store.exceptions)) if (e.programme === programme && !e.executed) e.superseded = true;
    this.store.exceptions[hash] = {
      hash,
      programme,
      kind: input.kind,
      amountInr: input.amountInr ?? 0,
      reason: input.reason,
      evidence: input.evidence ?? [],
      proposedBy: by.participant,
      approvals: [by.participant],
      executed: false,
      at: sent.timestamp,
    };
    return { sent, hash };
  }

  async approveException(programme: string, hash: string, byKey: string) {
    const meta = this.programme(programme);
    const by = this.actors.get(byKey);
    const sent = await this.tx(by, "ProgrammeEscrow", "approveException", [meta.id, hash], `Approve exact exception ${hash.slice(0, 10)}…`, programme);
    const e = this.store.exceptions[hash];
    if (e) {
      e.approvals.push(by.participant);
      e.executed = sent.logs.some((l) => this.chain.decodeLog(l)?.event === "ExceptionExecuted");
    }
    await this.afterSettlement(sent);
    return sent;
  }

  async dispute(programme: string, byKey: string, reason: string) {
    const meta = this.programme(programme);
    for (const e of Object.values(this.store.exceptions)) if (e.programme === programme && !e.executed) e.superseded = true;
    return this.tx(this.actors.get(byKey), "ProgrammeEscrow", "dispute", [meta.id, keccak256(toUtf8Bytes(reason))], `Dispute raised: ${reason}`, programme);
  }

  async award(programme: string, amountInr: number, reference: string) {
    const meta = this.programme(programme);
    const { a, signature } = await this.attest(this.actors.facilitator, kinds.ARBITRAL_AWARD, meta.id, wei(amountInr), fingerprint({ reference, amountInr }));
    const sent = await this.tx(this.actors.facilitator, "ProgrammeEscrow", "resolveByAward", [meta.id, a, signature], `Apply arbitral award ${reference}: ₹${amountInr.toLocaleString("en-IN")}`, programme);
    await this.afterSettlement(sent);
    return sent;
  }

  async panchayatCosign(panchayat: string, subject: string, note: string) {
    const gp = this.actors.account(panchayat, "PANCHAYAT");
    const { a, signature } = await this.attest(gp, kinds.PANCHAYAT_COSIGN, idOf(subject), 0, fingerprint({ subject, note }));
    return this.tx(gp, "VartulAttestations", "attestStandalone", [a, signature], `${this.actors.participantName(panchayat)} co-attests: ${note}`, subject);
  }

  // ---------------------------------------------------------------- settlement follow-ups (off-ledger)

  /** Payout adapter and certificate issuance driven by settlement events in a transaction. */
  private async afterSettlement(sent: SentTx) {
    const decoded = sent.logs.map((l) => this.chain.decodeLog(l)).filter((d) => d !== null);
    const lotCodeOf = (lotId: unknown) => {
      const hex = `0x${BigInt(lotId as bigint).toString(16).padStart(64, "0")}`;
      return Object.values(this.store.lots).find((l) => l.id === hex)?.code ?? hex;
    };
    for (const d of decoded) {
      if (d!.event === "CollectorPaid") {
        const actor = this.actors.byAddr(d!.args.collector as string);
        const lot = lotCodeOf(d!.args.lotId);
        const utr = `SBX${(BigInt(keccak256(toUtf8Bytes(`${sent.hash}:${d!.args.collector}:${lot}`))) % 10n ** 12n).toString().padStart(12, "0")}`;
        this.store.payouts.push({
          id: `PO-${String(this.store.payouts.length + 1).padStart(6, "0")}`,
          txHash: sent.hash,
          lot,
          programme: this.store.lots[lot]?.programme ?? "",
          saathi: actor?.key ?? (d!.args.collector as string),
          account: d!.args.collector as string,
          amountInr: rupees(d!.args.amount as bigint),
          grams: Number(d!.args.grams),
          vpa: `${(actor?.key ?? "unknown").toLowerCase()}@sbxupi`,
          utr,
          status: "SUCCESS",
          initiatedAt: sent.timestamp,
          completedAt: sent.timestamp + 40,
        });
      }
    }
    const allocated = decoded.filter((d) => d!.event === "ClaimAllocated");
    for (const d of allocated) {
      const type = Number(d!.args.claimType);
      if (type !== 1 && type !== 2) continue;
      const lotCode = lotCodeOf(d!.args.lotId);
      const lot = this.store.lots[lotCode];
      const holder = this.actors.byAddr(d!.args.holder as string);
      const claimId = Number(d!.args.claimId);
      const collectorsPaid = new Set(this.store.payouts.filter((p) => p.lot === lotCode).map((p) => p.saathi)).size;
      const prog = lot ? this.store.programmes[lot.programme] : undefined;
      await this.credentials.issue({
        kind: type === 1 ? "FundedRecoveryCertificate" : "MaterialSupplyCertificate",
        issuer: "VARTUL-NET",
        issuerName: "Vartul Network Facilitator (Suma)",
        subjectId: didFor(holder?.participant ?? "unknown"),
        subject: {
          holder: this.actors.participantName(holder?.participant ?? ""),
          claimId,
          claimType: type === 1 ? "FUNDED_RECOVERY" : "EPR_READY_SUPPLY",
          lot: lotCode,
          programme: prog?.spec.title,
          quantityKg: kg(Number(d!.args.grams)),
          material: lot ? materials[lot.material].label : undefined,
          region: prog?.spec.region,
          collectedFrom: lot ? isoOf(lot.windowStart).slice(0, 10) : undefined,
          collectedTo: lot ? isoOf(lot.windowEnd).slice(0, 10) : undefined,
          originator: lot ? this.actors.participantName(lot.originator) : undefined,
          recycler: lot?.receiver ? this.actors.participantName(lot.receiver) : undefined,
          verifier: prog ? this.actors.participantName(prog.spec.verifier) : undefined,
          collectorsPaid: type === 1 ? collectorsPaid : undefined,
          settlementTransaction: sent.hash,
          claimRegistry: this.chain.addresses!.VartulClaims,
          chainId: 31337,
          statement:
            type === 1
              ? "The holder funded the verified recovery of this quantity. This is an exclusive, non-transferable attribution claim; it is not ownership of material and not an offset or credit."
              : "The holder purchased this verified material and may use the documented supply in its own EPR records, subject to the network's claim-compatibility policy.",
        },
        issuedAt: sent.timestamp,
        summary: { claimId, lot: lotCode, holder: holder?.participant, kg: kg(Number(d!.args.grams)), type: type === 1 ? "FUNDED_RECOVERY" : "EPR_READY_SUPPLY" },
      });
    }
  }

  certificateForClaim(claimId: number) {
    return Object.values(this.store.credentials).find((c) => c.summary.claimId === claimId);
  }

  encodeRef(...values: string[]) {
    return keccak256(AbiCoder.defaultAbiCoder().encode(values.map(() => "string"), values));
  }
}
