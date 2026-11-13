import { materials, villages, saathis, participants, programmes as seededSpecs, openOfferings, heroSaathi } from "../dataset/murud.js";
import type { Vartul } from "../domain/vartul.js";
import { DomainError, idOf, kg, merkle } from "../lib/util.js";
import { verifyRecordSignature } from "../domain/evidence.js";
import type { LotProjection } from "../domain/indexer.js";

const SIMULATED = {
  payouts: "UPI payouts are simulated by a sandbox payment adapter; references are not real UTRs.",
  money: "dINR is a sandbox settlement token with no monetary value.",
  identity: "Registrations and credentials are issued by a demonstration issuer.",
};

export class Views {
  constructor(private v: Vartul) {}

  private get ix() {
    return this.v.indexer;
  }

  private lotByCode(code: string) {
    const meta = this.v.store.lots[code];
    if (!meta) throw new DomainError(`Unknown lot ${code}`, 404);
    const proj = this.ix.lots.get(meta.id);
    if (!proj) throw new DomainError(`Lot ${code} not indexed yet`, 503);
    return { meta, proj };
  }

  private programmeProj(code: string) {
    return this.ix.programmes.get(idOf(code));
  }

  async clock() {
    return { now: await this.v.chain.latestTimestamp(), scene: this.v.store.scene ?? null, snapshot: this.v.store.snapshot };
  }

  overview() {
    const totals = this.ix.totals();
    const lots = [...this.ix.lots.values()];
    const byMonth = new Map<string, { month: string; kg: number; collectorInr: number }>();
    for (const l of lots) {
      if (!["VERIFIED", "SETTLED"].includes(l.state)) continue;
      const month = new Date(l.mintedAt * 1000).toISOString().slice(0, 7);
      const row = byMonth.get(month) ?? { month, kg: 0, collectorInr: 0 };
      row.kg += kg(l.eligibleGrams);
      byMonth.set(month, row);
    }
    for (const p of this.v.store.payouts) {
      const month = new Date(p.completedAt * 1000).toISOString().slice(0, 7);
      const row = byMonth.get(month) ?? { month, kg: 0, collectorInr: 0 };
      row.collectorInr += p.amountInr;
      byMonth.set(month, row);
    }
    const byMaterial = new Map<string, number>();
    for (const l of lots) {
      if (!["VERIFIED", "SETTLED"].includes(l.state)) continue;
      const m = this.v.store.lots[l.code]?.material ?? "UNKNOWN";
      byMaterial.set(m, (byMaterial.get(m) ?? 0) + kg(l.eligibleGrams));
    }
    // Exclusivity check across the whole network: no claim type on any lot exceeds eligible grams.
    let overClaimed = 0;
    for (const l of lots) {
      const sums = new Map<string, number>();
      for (const c of l.claims) {
        const claim = this.ix.claims.get(c);
        if (claim) sums.set(claim.type, (sums.get(claim.type) ?? 0) + claim.grams);
      }
      for (const g of sums.values()) if (g > l.eligibleGrams) overClaimed++;
    }
    return {
      totals: { ...totals, overClaimedLots: overClaimed, saathisPaid: new Set(this.v.store.payouts.map((p) => p.saathi)).size },
      monthly: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
      materials: [...byMaterial.entries()].map(([m, value]) => ({ material: m, label: materials[m as keyof typeof materials]?.label ?? m, kg: value })),
      programmes: this.programmes(),
      organisations: participants.filter((p) => p.kind !== "panchayat").map((p) => ({ code: p.code, name: p.name, kind: p.kind, real: p.real, place: p.place })),
      simulated: SIMULATED,
    };
  }

  programmes() {
    return Object.values(this.v.store.programmes).map((meta) => {
      const p = this.programmeProj(meta.code);
      const lots = [...this.ix.lots.values()].filter((l) => l.programmeId === meta.id);
      return {
        code: meta.code,
        title: meta.spec.title,
        originator: meta.spec.originator,
        originatorName: this.v.actors.participantName(meta.spec.originator),
        verifier: meta.spec.verifier,
        verifierName: this.v.actors.participantName(meta.spec.verifier),
        sponsors: meta.spec.sponsors.map((s) => ({ ...s, name: this.v.actors.participantName(s.code) })),
        policy: meta.spec.policy,
        ratePerKg: meta.spec.ratePerKg,
        targetKg: meta.spec.targetKg,
        region: meta.spec.region,
        materials: meta.spec.materials,
        status: p?.status ?? "PROPOSED",
        budgetInr: p?.budgetInr ?? 0,
        fundedInr: p?.fundedInr ?? 0,
        paidInr: p?.paidInr ?? 0,
        refundedInr: p?.refundedInr ?? 0,
        heldInr: (p?.fundedInr ?? 0) - (p?.paidInr ?? 0) - (p?.refundedInr ?? 0),
        verifiedKg: kg(lots.filter((l) => ["VERIFIED", "SETTLED"].includes(l.state)).reduce((s, l) => s + l.eligibleGrams, 0)),
        settledKg: kg(p?.settledGrams ?? 0),
        acceptedKg: kg(p?.acceptedGrams ?? 0),
        lots: lots.length,
        deadline: p?.deadline ?? 0,
        commitmentTime: p?.commitmentTime ?? 0,
        termsHash: meta.termsHash,
      };
    });
  }

  programme(code: string) {
    const meta = this.v.store.programmes[code];
    if (!meta) throw new DomainError(`Unknown programme ${code}`, 404);
    const summary = this.programmes().find((p) => p.code === code)!;
    const proj = this.programmeProj(code);
    const lots = [...this.ix.lots.values()].filter((l) => l.programmeId === meta.id).map((l) => this.lotSummary(l));
    const payouts = this.v.store.payouts.filter((p) => p.programme === code);
    const claims = [...this.ix.claims.values()].filter((c) => c.programmeId === meta.id);
    const exceptions = Object.values(this.v.store.exceptions).filter((e) => e.programme === code);
    const txs = Object.values(this.v.store.txs).filter((t) => t.subject === code).sort((a, b) => a.block - b.block);
    return {
      ...summary,
      description: meta.spec.description,
      terms: meta.termsDocument,
      projection: proj,
      split: { collectorsBps: meta.spec.collectorBps, verifierBps: meta.spec.verifierBps, originatorBps: 10_000 - meta.spec.collectorBps - meta.spec.verifierBps },
      challengeHours: meta.spec.challengeHours,
      lots: lots.sort((a, b) => b.mintedAt - a.mintedAt),
      collectorPayoutsInr: payouts.reduce((s, p) => s + p.amountInr, 0),
      collectorsPaid: new Set(payouts.map((p) => p.saathi)).size,
      claims: claims.map((c) => ({ ...c, holderName: this.v.actors.participantName(c.holderParticipant), certificate: this.v.certificateForClaim(c.id)?.id })),
      exceptions,
      pendingLots: proj?.pendingLots ?? [],
      becknOrderId: meta.becknOrderId,
      history: txs,
    };
  }

  lotSummary(l: LotProjection) {
    const meta = this.v.store.lots[l.code];
    return {
      code: l.code,
      state: l.state,
      programme: meta?.programme,
      originator: l.originator,
      material: meta?.material,
      materialLabel: meta ? materials[meta.material].label : undefined,
      villages: meta?.villages ?? [],
      receiver: meta?.receiver,
      aggregatedKg: kg(l.aggregatedGrams),
      receivedKg: kg(l.receivedGrams),
      eligibleKg: kg(l.eligibleGrams),
      mintedAt: l.mintedAt,
      challengeDeadline: l.challengeDeadline,
      flags: meta ? this.v.anomalies.lotFlags(meta, l.receivedGrams).length : 0,
      sold: !!meta?.sale,
    };
  }

  lots(filter: { programme?: string; state?: string; originator?: string; receiver?: string; limit?: number }) {
    let lots = [...this.ix.lots.values()];
    if (filter.programme) lots = lots.filter((l) => l.programmeId === idOf(filter.programme!));
    if (filter.state) lots = lots.filter((l) => filter.state!.split(",").includes(l.state));
    if (filter.originator) lots = lots.filter((l) => l.originator === filter.originator);
    if (filter.receiver) lots = lots.filter((l) => this.v.store.lots[l.code]?.receiver === filter.receiver);
    return lots
      .sort((a, b) => b.mintedAt - a.mintedAt)
      .slice(0, filter.limit ?? 500)
      .map((l) => this.lotSummary(l));
  }

  /** The full proof chain of a lot: records, attestations, custody, verification, money and claims. */
  lot(code: string) {
    const { meta, proj } = this.lotByCode(code);
    const flags = this.v.anomalies.recordFlags();
    const records = meta.records.map((id) => {
      const r = this.v.store.records[id];
      return {
        id: r.id,
        saathi: r.saathi,
        village: r.village,
        route: r.route,
        material: r.material,
        kg: kg(r.grams),
        capturedAt: r.capturedAt,
        lat: r.lat,
        lng: r.lng,
        photoHash: r.photoHash,
        fingerprint: r.fingerprint,
        deviceSigned: verifyRecordSignature(r, this.v.actors.get(r.saathi).address),
        supervisorCosigned: !!r.supervisorSignature,
        flags: flags.get(r.id) ?? [],
      };
    });
    const attestations = Object.entries(proj.attestations)
      .filter(([, id]) => id !== `0x${"0".repeat(64)}`)
      .map(([stage, id]) => {
        const a = this.ix.attestations.get(id);
        return {
          stage,
          id,
          kind: a?.kind,
          participant: a?.participant,
          participantName: a ? this.v.actors.participantName(a.participant) : undefined,
          signer: a?.attester,
          quantityKg: a && /^\d+$/.test(a.quantity) ? kg(Number(a.quantity)) : undefined,
          ref: a?.ref,
          evidence: a?.evidence,
          at: a?.at,
          tx: a?.tx,
          revoked: a?.revoked,
        };
      });
    const txs = Object.values(this.v.store.txs)
      .filter((t) => t.subject === code)
      .sort((a, b) => a.block - b.block)
      .map((t) => ({ ...t, events: this.ix.eventsForTx(t.hash).map((e) => ({ contract: e.contract, event: e.event, args: e.args })) }));
    const payouts = this.v.store.payouts.filter((p) => p.lot === code);
    const claims = proj.claims.map((id) => {
      const c = this.ix.claims.get(id);
      return c ? { ...c, holderName: this.v.actors.participantName(c.holderParticipant), certificate: this.v.certificateForClaim(id)?.id } : { id };
    });
    const prog = this.v.store.programmes[meta.programme];
    return {
      ...this.lotSummary(proj),
      projection: proj,
      programmeTitle: prog?.spec.title,
      verifier: prog?.spec.verifier,
      proofRoot: meta.proofRoot,
      proofRootOnLedger: proj.proofRoot,
      proofRootMatches: meta.proofRoot === proj.proofRoot,
      bale: meta.bale,
      windowStart: meta.windowStart,
      windowEnd: meta.windowEnd,
      inputKg: kg(meta.inputGrams),
      contaminationKg: kg(meta.contaminationGrams),
      massBalance: {
        inputKg: kg(meta.inputGrams),
        contaminationKg: kg(meta.contaminationGrams),
        netKg: kg(meta.inputGrams - meta.contaminationGrams),
        aggregatedKg: kg(meta.aggregatedGrams),
        receivedKg: kg(proj.receivedGrams),
        eligibleKg: kg(proj.eligibleGrams),
        toleranceBps: 100,
        receiptToleranceBps: 200,
      },
      transportDoc: meta.transportDoc,
      weighSlip: meta.weighSlip,
      verification: meta.verification,
      challenge: meta.challenge,
      review: meta.review,
      sale: meta.sale,
      lotFlags: this.v.anomalies.lotFlags(meta, proj.receivedGrams),
      samplingPlan: this.v.anomalies.samplingPlan(meta),
      records,
      collectors: proj.contributions.map((c) => ({
        ...c,
        kg: c.grams / 1000,
        excludedKg: c.excluded / 1000,
        paidInr: payouts.filter((p) => p.saathi === c.saathi).reduce((s, p) => s + p.amountInr, 0),
        payout: payouts.find((p) => p.saathi === c.saathi),
      })),
      attestations,
      transactions: txs,
      payouts,
      claims,
      credentials: Object.values(this.v.store.credentials).filter((c) => c.summary.lot === code).map((c) => ({ id: c.id, type: c.type, issuer: c.issuer })),
    };
  }

  recordProof(code: string, recordId: string) {
    const { meta, proj } = this.lotByCode(code);
    const index = meta.records.indexOf(recordId);
    if (index < 0) throw new DomainError(`${recordId} is not in ${code}`, 404);
    const tree = merkle(meta.records.map((id) => this.v.store.records[id].fingerprint));
    const leaf = this.v.store.records[recordId].fingerprint;
    const proof = tree.proof(index);
    return { record: recordId, leaf, proof, root: proj.proofRoot, verified: tree.verify(leaf, proof, proj.proofRoot) };
  }

  record(id: string) {
    const r = this.v.store.records[id];
    if (!r) throw new DomainError(`Unknown record ${id}`, 404);
    return { ...r, flags: this.v.anomalies.recordFlags().get(id) ?? [], deviceSigned: verifyRecordSignature(r, this.v.actors.get(r.saathi).address) };
  }

  claims(filter: { holder?: string; type?: string }) {
    let list = [...this.ix.claims.values()];
    if (filter.holder) list = list.filter((c) => c.holderParticipant === filter.holder);
    if (filter.type) list = list.filter((c) => c.type === filter.type);
    return list.sort((a, b) => b.id - a.id).map((c) => ({ ...c, holderName: this.v.actors.participantName(c.holderParticipant), certificate: this.v.certificateForClaim(c.id)?.id }));
  }

  participant(code: string) {
    const p = participants.find((x) => x.code === code);
    if (!p) throw new DomainError(`Unknown participant ${code}`, 404);
    const accounts = p.accounts.map((a) => {
      const actor = this.v.actors.get(a.key);
      return { ...a, address: actor.address, balanceInr: this.ix.balanceInr(actor.address) };
    });
    const claims = this.claims({ holder: code });
    const progs = this.programmes().filter((x) => x.originator === code || x.verifier === code || x.sponsors.some((s) => s.code === code));
    return {
      ...p,
      accounts,
      balanceInr: accounts.reduce((s, a) => s + a.balanceInr, 0),
      credential: this.v.store.credentials[`PC-${code}`]?.id,
      programmes: progs,
      claims,
      claimSummary: {
        fundedRecoveryKg: kg(claims.filter((c) => c.type === "FUNDED_RECOVERY").reduce((s, c) => s + c.grams, 0)),
        eprSupplyKg: kg(claims.filter((c) => c.type === "EPR_READY_SUPPLY").reduce((s, c) => s + c.grams, 0)),
        contested: claims.filter((c) => c.status === "CONTESTED").length,
        revoked: claims.filter((c) => c.status === "REVOKED").length,
      },
    };
  }

  /** The worker's own view (simulated field app). Contains her name: never exposed on public routes. */
  saathi(id: string) {
    const s = saathis.find((x) => x.id === id);
    if (!s) throw new DomainError(`Unknown collector ${id}`, 404);
    const flags = this.v.anomalies.recordFlags();
    const records = Object.values(this.v.store.records)
      .filter((r) => r.saathi === id)
      .sort((a, b) => b.capturedAt - a.capturedAt);
    const statusOf = (lot?: string) => {
      if (!lot) return "synced";
      const meta = this.v.store.lots[lot];
      const proj = meta && this.ix.lots.get(meta.id);
      if (!proj) return "in lot";
      return ({ MINTED: "in lot", IN_TRANSIT: "in transit", RECEIVED: "received", VERIFIED: "verified", CHALLENGED: "under challenge", SETTLED: "paid", REJECTED: "rejected", UNDER_REVIEW: "under review", VOIDED: "voided" } as Record<string, string>)[proj.state] ?? proj.state;
    };
    const payouts = this.v.store.payouts.filter((p) => p.saathi === id).sort((a, b) => b.completedAt - a.completedAt);
    const exclusions = Object.values(this.v.store.lots).flatMap((l) => (l.verification?.excluded ?? []).filter((e) => e.saathi === id).map((e) => ({ lot: l.code, kg: kg(e.grams), reason: e.reason })));
    const verifiedGrams = [...this.ix.lots.values()].reduce((s, l) => s + l.contributions.filter((c) => c.saathi === id && ["SETTLED", "VERIFIED"].includes(l.state)).reduce((x, c) => x + c.grams - c.excluded, 0), 0);
    return {
      id: s.id,
      name: s.name,
      org: s.org,
      orgName: this.v.actors.participantName(s.org),
      villages: s.villages.map((c) => villages.find((v) => v.code === c)?.name ?? c),
      isHero: id === heroSaathi,
      account: this.v.actors.get(id).address,
      balanceInr: this.ix.balanceInr(this.v.actors.get(id).address),
      totals: {
        records: records.length,
        capturedKg: kg(records.reduce((x, r) => x + r.grams, 0)),
        verifiedKg: kg(verifiedGrams),
        paidInr: payouts.reduce((x, p) => x + p.amountInr, 0),
      },
      records: records.slice(0, 60).map((r) => ({ id: r.id, material: r.material, kg: kg(r.grams), capturedAt: r.capturedAt, route: r.route, lot: r.lot, status: statusOf(r.lot), flags: (flags.get(r.id) ?? []).map((f) => f.code) })),
      payouts,
      exclusions,
      simulated: "Simulated field app. Names are fictional and stay in the originator's private store.",
    };
  }

  anomalies() {
    const flags = this.v.anomalies.recordFlags();
    const flagged = [...flags.entries()]
      .filter(([, f]) => f.some((x) => x.severity !== "low"))
      .map(([id, f]) => {
        const r = this.v.store.records[id];
        return { record: id, saathi: r.saathi, org: r.org, village: r.village, kg: kg(r.grams), capturedAt: r.capturedAt, lot: r.lot, flags: f };
      })
      .sort((a, b) => b.capturedAt - a.capturedAt);
    const lots = Object.values(this.v.store.lots)
      .map((meta) => ({ code: meta.code, flags: this.v.anomalies.lotFlags(meta, this.ix.lots.get(meta.id)?.receivedGrams) }))
      .filter((l) => l.flags.length);
    return { records: flagged, lots, rules: [
      { code: "WEIGHT_OUTLIER", rule: "Trip weight above 3× the collector's median (and +20 kg)" },
      { code: "DUPLICATE_PHOTO", rule: "Photo fingerprint seen on an earlier record" },
      { code: "GPS_OFF_ROUTE", rule: "Location fix more than 1.5 km from the assigned route" },
      { code: "ODD_HOURS", rule: "Captured outside 06:00–21:00 IST" },
      { code: "MASS_BALANCE_NEAR_LIMIT", rule: "Weighed lot above 99.5% of net captured inputs" },
      { code: "RECEIPT_VARIANCE", rule: "Weighbridge differs from MRC weight by more than 1.5%" },
    ] };
  }

  verifierQueue(verifier: string) {
    const progIds = new Set(Object.values(this.v.store.programmes).filter((p) => p.spec.verifier === verifier).map((p) => p.id));
    const lots = [...this.ix.lots.values()].filter((l) => progIds.has(l.programmeId));
    return {
      awaiting: lots.filter((l) => l.state === "RECEIVED").map((l) => this.lotSummary(l)),
      inWindow: lots.filter((l) => ["VERIFIED", "CHALLENGED"].includes(l.state)).map((l) => this.lotSummary(l)),
      recent: lots.filter((l) => ["SETTLED", "REJECTED"].includes(l.state)).sort((a, b) => b.mintedAt - a.mintedAt).slice(0, 25).map((l) => this.lotSummary(l)),
    };
  }

  facility(code: string) {
    const lots = [...this.ix.lots.values()].filter((l) => this.v.store.lots[l.code]?.receiver === code);
    const forSale = [...this.ix.lots.values()].filter((l) => l.state === "SETTLED" && !this.v.store.lots[l.code]?.sale);
    return {
      inbound: lots.filter((l) => l.state === "IN_TRANSIT").map((l) => this.lotSummary(l)),
      received: lots.filter((l) => l.state !== "IN_TRANSIT").sort((a, b) => b.mintedAt - a.mintedAt).slice(0, 40).map((l) => this.lotSummary(l)),
      available: forSale.slice(0, 40).map((l) => this.lotSummary(l)),
      purchased: Object.values(this.v.store.lots).filter((l) => l.sale?.buyer === code).map((l) => ({ code: l.code, priceInr: l.sale!.priceInr, material: l.material })),
    };
  }

  panchayat(villageCode: string) {
    const v = villages.find((x) => x.code === villageCode);
    if (!v) throw new DomainError(`Unknown village ${villageCode}`, 404);
    const records = Object.values(this.v.store.records).filter((r) => r.village === villageCode);
    const byMonth = new Map<string, Record<string, number>>();
    for (const r of records) {
      const month = new Date(r.capturedAt * 1000).toISOString().slice(0, 7);
      const row = byMonth.get(month) ?? {};
      row[r.material] = (row[r.material] ?? 0) + r.grams / 1000;
      byMonth.set(month, row);
    }
    const villageSaathis = new Set(records.map((r) => r.saathi));
    const paid = this.v.store.payouts.filter((p) => villageSaathis.has(p.saathi)).reduce((s, p) => s + p.amountInr, 0);
    const concerns = Object.values(this.v.store.lots).filter((l) => l.challenge && l.villages.includes(villageCode)).map((l) => ({ lot: l.code, ...l.challenge }));
    return {
      village: v,
      panchayat: { code: v.panchayat, name: this.v.actors.participantName(v.panchayat) },
      monthly: [...byMonth.entries()].sort().map(([month, row]) => ({ month, ...row })),
      capturedKg: records.reduce((s, r) => s + r.grams, 0) / 1000,
      activeCollectors: villageSaathis.size,
      incentivesPaidInr: paid,
      collectionPoints: [{ name: `${v.name} collection point`, lat: v.lat, lng: v.lng }],
      concerns,
      language: { current: "English", marathi: "Coming soon" },
    };
  }

  transactions(limit = 100, subject?: string) {
    return Object.values(this.v.store.txs)
      .filter((t) => !subject || t.subject === subject)
      .sort((a, b) => b.block - a.block)
      .slice(0, limit)
      .map((t) => ({ ...t, actorLabel: this.v.actors.byKey.get(t.actor)?.label, events: this.ix.eventsForTx(t.hash).map((e) => e.event) }));
  }

  transaction(hash: string) {
    const meta = this.v.store.txs[hash];
    const events = this.ix.eventsForTx(hash);
    if (!meta && !events.length) throw new DomainError(`Unknown transaction ${hash}`, 404);
    return { ...meta, events };
  }

  tokenManagers() {
    const a = this.v.chain.addresses!;
    const lots = [...this.ix.lots.values()];
    const claims = [...this.ix.claims.values()];
    const count = (xs: string[]) => xs.reduce<Record<string, number>>((m, s) => ((m[s] = (m[s] ?? 0) + 1), m), {});
    return {
      chain: { id: 31337, name: "Vartul local sandbox chain (Anvil)", publicEndState: "Public testnet deployment simulated; see the deployment tooling." },
      managers: [
        { name: "Recovery lots", contract: "RecoveryLotRegistry", address: a.RecoveryLotRegistry, standard: "ERC-1155 (restricted transfer), grams", supply: kg(lots.reduce((s, l) => s + l.aggregatedGrams, 0)), unit: "kg", count: lots.length, states: count(lots.map((l) => l.state)) },
        { name: "Claims", contract: "VartulClaims", address: a.VartulClaims, standard: "Non-transferable exclusive claims", supply: kg(claims.reduce((s, c) => s + c.grams, 0)), unit: "kg", count: claims.length, states: count(claims.map((c) => c.status)), types: count(claims.map((c) => c.type)) },
        { name: "Sandbox money", contract: "SandboxINR", address: a.SandboxINR, standard: "ERC-20, registered holders only", supply: this.ix.totals().dinrSupply, unit: "dINR", count: [...this.ix.balances.values()].filter((b) => b > 0n).length },
        { name: "Programme escrow", contract: "ProgrammeEscrow", address: a.ProgrammeEscrow, standard: "Conditional settlement", supply: this.ix.balanceInr(a.ProgrammeEscrow), unit: "dINR held", count: this.ix.programmes.size },
        { name: "Attestations", contract: "VartulAttestations", address: a.VartulAttestations, standard: "EIP-712 signed statements", supply: this.ix.attestations.size, unit: "records", count: [...this.ix.attestations.values()].filter((x) => x.revoked).length },
        { name: "Registry", contract: "VartulRegistry", address: a.VartulRegistry, standard: "Participants and role credentials", supply: participants.length, unit: "participants", count: this.v.actors.byKey.size },
        { name: "Payout router", contract: "PayoutRouter", address: a.PayoutRouter, standard: "Pro-rata collector payouts", supply: this.v.store.payouts.length, unit: "payouts", count: new Set(this.v.store.payouts.map((p) => p.saathi)).size },
        { name: "Material settlement", contract: "MaterialSettlement", address: a.MaterialSettlement, standard: "Delivery versus payment", supply: Object.values(this.v.store.lots).filter((l) => l.sale).length, unit: "sales", count: 0 },
      ],
    };
  }

  offerings() {
    return [...seededSpecs, ...openOfferings];
  }

  /** Public certificate verification: signature and status-list check plus a live ledger cross-check. */
  async verifyCredential(id: string) {
    const c = this.v.store.credentials[id];
    if (!c) throw new DomainError(`No credential ${id}`, 404);
    const result = await this.v.credentials.verify(c.jwt);
    const checks = [...result.checks];
    let ledger: Record<string, unknown> | undefined;
    const claimId = c.summary.claimId as number | undefined;
    if (claimId) {
      const claim = this.ix.claims.get(claimId);
      const lot = claim && this.ix.lots.get(claim.lotId);
      ledger = { claim, lotState: lot?.state };
      checks.push({
        check: "Ledger claim status",
        ok: claim?.status === "VALID",
        detail: claim ? `Claim #${claimId} is ${claim.status} in the claim registry (lot ${claim.lotCode}: ${lot?.state})` : "Claim not found on ledger",
      });
      if (claim && lot) {
        const sameType = lot.claims.map((x) => this.ix.claims.get(x)).filter((x) => x?.type === claim.type);
        const total = sameType.reduce((s, x) => s + (x?.grams ?? 0), 0);
        checks.push({
          check: "Exclusivity",
          ok: total <= lot.eligibleGrams,
          detail: `${kg(total)} kg of ${claim.type} claims against ${kg(lot.eligibleGrams)} kg verified: no double counting`,
        });
        if (claim.disclosures.length) checks.push({ check: "Disclosures", ok: true, detail: `Coexists with ${claim.disclosures.join(", ")} claim on the same lot (disclosed)` });
      }
    }
    const verdict = checks.every((x) => x.ok) ? "VALID" : checks.some((x) => x.check === "Ledger claim status" && !x.ok && (ledger?.claim as { status?: string })?.status === "CONTESTED") ? "CONTESTED" : "INVALID";
    return {
      id,
      type: c.type,
      verdict,
      checks,
      credential: result.credential,
      header: result.header,
      jwt: c.jwt,
      ledger,
      verifyUrl: `${this.v.baseUrl}/verify/${id}`,
    };
  }
}
