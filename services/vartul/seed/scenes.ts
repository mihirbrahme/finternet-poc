/**
 * The eleven demonstration scenes (product document, Section 19.3). Each step performs real
 * actions through the same domain and network code the product surfaces use.
 */
import type { Runtime } from "../runtime.js";
import type { BecknNetwork } from "../beckn/network.js";
import { heroLot, heroSaathi } from "../dataset/murud.js";
import { DomainError, kg } from "../lib/util.js";

export interface StepResult {
  summary: string;
  refs?: { lot?: string; programme?: string; tx?: string; credential?: string; transactionId?: string; saathi?: string };
}

export interface SceneStep {
  id: string;
  label: string;
  actor: string;
  detail: string;
  run: (ctx: SceneContext) => Promise<StepResult>;
}

export interface SceneContext {
  rt: Runtime;
  beckn: BecknNetwork;
  state: Record<string, any>;
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  question: string;
  narrative: string;
  surface: (ctx: SceneContext) => string;
  steps: SceneStep[];
  points: string[];
}

const HOUR = 3600;
const v = (ctx: SceneContext) => ctx.rt.vartul;
const settle = async <T>(ctx: SceneContext, work: () => Promise<T>) =>
  ctx.rt.exclusive(async () => {
    const r = await work();
    await v(ctx).sync();
    return r;
  });

const heroCertificate = (ctx: SceneContext) => {
  const lot = v(ctx).indexer.lots.get(v(ctx).store.lots[heroLot]?.id ?? "");
  const claim = lot?.claims.map((c) => v(ctx).indexer.claims.get(c)).find((c) => c?.type === "FUNDED_RECOVERY");
  return claim ? v(ctx).certificateForClaim(claim.id)?.id : undefined;
};

export const scenes: Scene[] = [
  {
    id: "scene-01",
    number: 1,
    title: "The network at a glance",
    question: "What does trusted recovery look like across a whole coast?",
    narrative:
      "Six months of activity on the Raigad coast: four funded programmes, three NGOs, three sponsors, two recyclers and two verifiers. Every number on this page is derived from the ledger: verified kilograms, money released, the share that reached collectors, and zero over-claimed lots.",
    surface: () => "/network",
    steps: [],
    points: ["Verified kg, not reported kg", "Last-mile share computed from payout events", "Zero over-claimed lots across the network"],
  },
  {
    id: "scene-02",
    number: 2,
    title: "A sponsor discovers and commits",
    question: "How does a funder find a credible programme without a closed marketplace?",
    narrative:
      "Coastline Giving Circle wants coastal plastics recovery with at least a third reaching collectors. Its sponsor desk searches the open network; three NGOs answer with signed catalogues whose track records come from the ledger. It chooses Aamhi's fishing-net programme, receives exact terms, funds the escrow and confirms. Aamhi accepts on the ledger and the commitment time is fixed.",
    surface: () => "/sponsor?as=COASTLINE",
    steps: [
      {
        id: "search",
        label: "Search the open network",
        actor: "Coastline Giving Circle (sponsor desk BAP)",
        detail: "Signed Beckn search broadcast by the gateway to every NGO provider",
        run: async (ctx) => {
          const r = await ctx.beckn.sponsorSearch({ materials: ["NETS", "FOOTWEAR", "PET", "MLP"], minCollectorShareBps: 3000, budgetInr: 300_000 });
          ctx.state.becknTx = r.transactionId;
          const offer = r.offers.find((o: any) => o.item.id === "PRG-MRD-NETS-2027");
          ctx.state.bpp = offer?.bpp;
          return { summary: `${r.offers.length} programmes from ${r.responders.length} NGOs, every message signature verified`, refs: { transactionId: r.transactionId } };
        },
      },
      {
        id: "select",
        label: "Select Aamhi's nets programme for ₹3,00,000",
        actor: "Coastline Giving Circle",
        detail: "Quote with the split: collectors, operations, verification",
        run: async (ctx) => {
          const r = await ctx.beckn.sponsorStep("select", { transactionId: ctx.state.becknTx, bpp: ctx.state.bpp, item: "PRG-MRD-NETS-2027", fundingInr: 300_000 });
          const b = r.response.order.quote.breakup;
          return { summary: `Quoted: ₹${Number(b[0].price.value).toLocaleString("en-IN")} to collectors, ₹${Number(b[1].price.value).toLocaleString("en-IN")} operations, ₹${Number(b[2].price.value).toLocaleString("en-IN")} verification`, refs: { transactionId: r.transactionId } };
        },
      },
      {
        id: "init",
        label: "Receive the exact terms and their fingerprint",
        actor: "Coastline Giving Circle",
        detail: "on_init returns the terms document both parties will sign",
        run: async (ctx) => {
          const r = await ctx.beckn.sponsorStep("init", { transactionId: ctx.state.becknTx, bpp: ctx.state.bpp, item: "PRG-MRD-NETS-2027", fundingInr: 300_000, sponsor: "COASTLINE" });
          ctx.state.termsFingerprint = r.response.order.terms.fingerprint;
          return { summary: `Terms fingerprint ${r.response.order.terms.fingerprint.slice(0, 18)}…`, refs: { transactionId: r.transactionId } };
        },
      },
      {
        id: "confirm",
        label: "Fund escrow and confirm; Aamhi accepts on the ledger",
        actor: "Coastline Giving Circle → Project Aamhi",
        detail: "Propose + fund (sponsor), confirm (network), accept exact terms (originator)",
        run: async (ctx) => {
          const r = await ctx.beckn.sponsorConfirm({ transactionId: ctx.state.becknTx, bpp: ctx.state.bpp, item: "PRG-MRD-NETS-2027", fundingInr: 300_000, sponsor: "COASTLINE" });
          return { summary: `Order ${r.response.order.id} active; ₹3,00,000 held in escrow; commitment ${r.response.order.ledger.commitment_time}`, refs: { programme: "PRG-MRD-NETS-2027", tx: r.response.order.ledger.commitment_tx, transactionId: r.transactionId } };
        },
      },
    ],
    points: ["Discovery through an open protocol, not a closed platform", "Catalogue track records are ledger references", "Both parties sign the same terms fingerprint"],
  },
  {
    id: "scene-03",
    number: 3,
    title: "Follow one bag",
    question: "Can a bag of plastic on Korlai shore become a trusted, fundable asset?",
    narrative:
      "Sunanda captures a 12.4 kg bag of LDPE film on the Korlai shore route, signed on her device. At Kashid MRC, 214 records totalling 1,296 kg are sorted: 84 kg of contamination out, 1,212 kg baled and weighed. The ledger checks mass balance and mints lot VRL-MRD-2026-0042 with the Merkle root of every record. Talvan Polymers' weighbridge reads 1,196 kg. Nirikshan Assurance samples the records and accepts 1,180 kg, excluding 16 kg. After the challenge window, one transaction releases ₹21,240: ₹8,496 to eleven collectors, ₹11,682 to Aamhi, ₹1,062 to the verifier, and an exclusive 1,180 kg claim to Tidewell Foods.",
    surface: () => `/lots/${heroLot}`,
    steps: [
      {
        id: "capture",
        label: "Sunanda captures 12.4 kg of LDPE on the Korlai shore",
        actor: `Safai saathi ${heroSaathi} (field app)`,
        detail: "Weight, photo fingerprint, GPS and time, signed by her device key",
        run: async (ctx) => {
          const r = await settle(ctx, () => v(ctx).captureRecord({ saathi: heroSaathi, material: "LDPE", grams: 12_400, village: "KRL", route: "Korlai shore route" }));
          ctx.state.heroRecord = r.id;
          return { summary: `Record ${r.id} signed and synced`, refs: { saathi: heroSaathi } };
        },
      },
      {
        id: "mint",
        label: "Kashid MRC weighs 1,212 kg and mints the lot",
        actor: "Aamhi MRC operator",
        detail: "Mass balance: 1,296 kg captured − 84 kg contamination ≥ 1,212 kg weighed",
        run: async (ctx) => {
          const records = v(ctx).availableRecords("AAMHI", "LDPE").map((r) => r.id);
          const total = records.reduce((s, id) => s + v(ctx).store.records[id].grams, 0);
          if (total !== 1_296_000) throw new DomainError(`Expected 1,296 kg of synced LDPE records, found ${kg(total)} kg`);
          const { sent, code } = await settle(ctx, () => v(ctx).mintLot({ code: heroLot, programme: "PRG-MRD-COASTAL-2026", material: "LDPE", recordIds: records, contaminationGrams: 84_000, aggregatedGrams: 1_212_000 }));
          return { summary: `${code} minted: 1,212,000 g from ${records.length} records`, refs: { lot: code, tx: sent.hash } };
        },
      },
      {
        id: "dispatch",
        label: "Dispatch to Talvan Polymers",
        actor: "Project Aamhi",
        detail: "Transport document fingerprint anchored",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).dispatch(heroLot, "TALVAN"));
          return { summary: "In transit to Talvan Polymers, Roha", refs: { lot: heroLot, tx: sent.hash } };
        },
      },
      {
        id: "receipt",
        label: "Talvan's weighbridge confirms 1,196 kg",
        actor: "Talvan Polymers",
        detail: "1.3% variance, inside the 2% tolerance",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).confirmReceipt(heroLot, 1_196_000));
          return { summary: "Received 1,196 kg (weighbridge slip anchored)", refs: { lot: heroLot, tx: sent.hash } };
        },
      },
      {
        id: "verify",
        label: "Nirikshan samples and accepts 1,180 kg",
        actor: "Nirikshan Assurance",
        detail: "16 kg of rigid caps excluded from one collector's bags",
        run: async (ctx) => {
          const sent = await settle(ctx, () =>
            v(ctx).verifyLot(heroLot, {
              eligibleGrams: 1_180_000,
              excluded: [{ saathi: "SS-MRD-0003", grams: 16_000, reason: "Sampled bags contained 16 kg of rigid HDPE caps, not LDPE film" }],
              notes: "Twelve records sampled against MRC log and weighbridge slip; 16 kg of rigid caps excluded.",
            }));
          return { summary: "Verified 1,180 kg eligible; 72-hour challenge window open", refs: { lot: heroLot, tx: sent.hash } };
        },
      },
      {
        id: "window",
        label: "Challenge window passes (sandbox clock +72 h)",
        actor: "Sandbox time control",
        detail: "Anyone with standing could challenge during these 72 hours",
        run: async (ctx) => {
          await settle(ctx, () => v(ctx).chain.increaseTime(72 * HOUR + 120));
          return { summary: "No challenge raised" };
        },
      },
      {
        id: "settle",
        label: "Atomic settlement: payouts, fees and the sponsor's claim",
        actor: "Anyone (permissionless finalisation)",
        detail: "One transaction, or nothing",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).finalizeLot(heroLot));
          const paid = v(ctx).store.payouts.filter((p) => p.lot === heroLot);
          return { summary: `₹21,240 released; ${paid.length} collectors paid ₹${Math.round(paid.reduce((s, p) => s + p.amountInr, 0)).toLocaleString("en-IN")}; 1,180 kg claim to Tidewell Foods`, refs: { lot: heroLot, tx: sent.hash, credential: heroCertificate(ctx) } };
        },
      },
    ],
    points: ["Mass balance enforced by the ledger", "Independent verification with exclusions", "Money, payouts and claims move atomically"],
  },
  {
    id: "scene-04",
    number: 4,
    title: "Sunanda gets paid",
    question: "What does the worker see?",
    narrative:
      "Sunanda's phone shows the bag she captured, the lot it joined, its verification and her incentive payout with its UPI reference. She can export a verifiable work record, only at her request.",
    surface: () => `/field?saathi=${heroSaathi}`,
    steps: [
      {
        id: "work-record",
        label: "Sunanda exports her work-record credential",
        actor: `Safai saathi ${heroSaathi}`,
        detail: "Issued by Aamhi at the worker's request",
        run: async (ctx) => {
          const views = new (await import("../api/views.js")).Views(v(ctx));
          const s = views.saathi(heroSaathi);
          const c = await settle(ctx, async () =>
            v(ctx).credentials.issue({
              kind: "WorkRecordCredential",
              issuer: "AAMHI",
              issuerName: "Project Aamhi",
              subjectId: `urn:vartul:collector:${heroSaathi}`,
              subject: { collector: heroSaathi, organisation: "Project Aamhi", verifiedKg: s.totals.verifiedKg, incentivesInr: s.totals.paidInr, records: s.totals.records, issuedAtRequestOfHolder: true },
              issuedAt: await v(ctx).chain.latestTimestamp(),
              summary: { saathi: heroSaathi, verifiedKg: s.totals.verifiedKg },
            }));
          return { summary: `Work record ${c.id}: ${s.totals.verifiedKg.toLocaleString("en-IN")} kg verified, ₹${Math.round(s.totals.paidInr).toLocaleString("en-IN")} received`, refs: { credential: c.id, saathi: heroSaathi } };
        },
      },
    ],
    points: ["Pseudonymous on the ledger, named only on her own phone", "Payout references she can show", "Portable proof of work, at her choice"],
  },
  {
    id: "scene-05",
    number: 5,
    title: "A stranger scans the certificate",
    question: "Can anyone check the claim without trusting Vartul?",
    narrative:
      "Tidewell Foods' certificate carries a QR code. Scanning it checks the issuer's signature, the revocation list and the live claim on the ledger: valid, 1,180 kg of LDPE from Murud taluka, received by a registered recycler, verified by an accredited verifier, eleven collectors paid, claimed by no one else.",
    surface: (ctx) => `/verify/${heroCertificate(ctx) ?? ""}`,
    steps: [],
    points: ["Seeing is believing: signature, status list and ledger in one check", "No personal data", "Exclusivity is a ledger fact"],
  },
  {
    id: "scene-06",
    number: 6,
    title: "Fraud caught",
    question: "What happens when someone games the system?",
    narrative:
      "Collector SS-MRD-0009 reports a 46 kg trip against a 9 kg median, reuses a photo from another collector's record and records a location 2 km off the Borli route. The anomaly engine flags all three before aggregation. The lot carries the flags, the verifier's sampling plan includes every flagged record, the flagged grams are excluded, and the payout skips them.",
    surface: () => "/anomalies",
    steps: [
      {
        id: "mint",
        label: "MRC aggregates the PET batch, flags visible",
        actor: "Aamhi MRC operator",
        detail: "Flagged records travel with the lot",
        run: async (ctx) => {
          const records = v(ctx).availableRecords("AAMHI", "PET").map((r) => r.id);
          const total = records.reduce((s, id) => s + v(ctx).store.records[id].grams, 0);
          const contamination = Math.round(total * 0.04);
          const { code, sent } = await settle(ctx, () => v(ctx).mintLot({ programme: "PRG-MRD-COASTAL-2026", material: "PET", recordIds: records, contaminationGrams: contamination, aggregatedGrams: Math.round((total - contamination) * 0.995) }));
          ctx.state.fraudLot = code;
          return { summary: `${code} minted with ${records.length} records; ${v(ctx).anomalies.lotFlags(v(ctx).store.lots[code]).length} lot-level flag(s)`, refs: { lot: code, tx: sent.hash } };
        },
      },
      {
        id: "custody",
        label: "Dispatch and weighbridge receipt",
        actor: "Project Aamhi → Talvan Polymers",
        detail: "Custody continues normally",
        run: async (ctx) => {
          const code = ctx.state.fraudLot as string;
          await settle(ctx, () => v(ctx).dispatch(code, "TALVAN"));
          const sent = await settle(ctx, () => v(ctx).confirmReceipt(code, Math.round(v(ctx).store.lots[code].aggregatedGrams * 0.994)));
          return { summary: "Received at Talvan Polymers", refs: { lot: code, tx: sent.hash } };
        },
      },
      {
        id: "verify",
        label: "Verifier excludes the flagged records",
        actor: "Nirikshan Assurance",
        detail: "Weight outlier, duplicate photo and off-route location excluded",
        run: async (ctx) => {
          const code = ctx.state.fraudLot as string;
          const lot = v(ctx).store.lots[code];
          const flags = v(ctx).anomalies.recordFlags();
          const flagged = lot.records.filter((id) => (flags.get(id) ?? []).some((f) => f.severity !== "low"));
          const byCollector = new Map<string, number>();
          for (const id of flagged) byCollector.set(v(ctx).store.records[id].saathi, (byCollector.get(v(ctx).store.records[id].saathi) ?? 0) + v(ctx).store.records[id].grams);
          const excluded = [...byCollector].map(([saathi, grams]) => ({ saathi, grams, reason: "Flagged records excluded pending review: weight outlier, duplicate photo, off-route location" }));
          const received = lot.weighSlip!.grams;
          const excludedGrams = excluded.reduce((s, e) => s + e.grams, 0);
          const sent = await settle(ctx, () => v(ctx).verifyLot(code, { eligibleGrams: received - excludedGrams, excluded, notes: `${flagged.length} flagged records sampled and excluded; collector referred to supervisor and Panchayat.` }));
          return { summary: `${kg(excludedGrams)} kg excluded from ${excluded.map((e) => e.saathi).join(", ")}; ${kg(received - excludedGrams)} kg eligible`, refs: { lot: code, tx: sent.hash } };
        },
      },
      {
        id: "settle",
        label: "Settle after the window: the payout skips excluded grams",
        actor: "Sandbox clock +72 h, then finalisation",
        detail: "Other collectors are paid normally",
        run: async (ctx) => {
          const code = ctx.state.fraudLot as string;
          await settle(ctx, () => v(ctx).chain.increaseTime(72 * HOUR + 120));
          const sent = await settle(ctx, () => v(ctx).finalizeLot(code));
          const flaggedPay = v(ctx).store.payouts.filter((p) => p.lot === code && p.saathi === "SS-MRD-0009").reduce((s, p) => s + p.amountInr, 0);
          return { summary: `Settled. SS-MRD-0009 paid only for unflagged grams (₹${Math.round(flaggedPay).toLocaleString("en-IN")})`, refs: { lot: code, tx: sent.hash } };
        },
      },
    ],
    points: ["Flags are visible before money moves", "People decide; the ledger enforces the decision", "Honest collectors are not penalised"],
  },
  {
    id: "scene-07",
    number: 7,
    title: "When reality differs",
    question: "What if the monsoon makes the target impossible?",
    narrative:
      "The Kashid & Korlai shoreline milestone promised ₹2,00,000 at 10,000 kg. The monsoon closed shore access for weeks, and about 9,300 kg was verified. A fixed-on-target policy pays nothing automatically. Aamhi proposes a pro-rata settlement with evidence; both sponsors approve the exact proposal; settlement and the refund of the balance execute in the approving transaction. The recorded outcome stays at the verified quantity.",
    surface: () => "/programmes/PRG-MRD-BEACH-2026",
    steps: [
      {
        id: "propose",
        label: "Aamhi proposes a pro-rata settlement",
        actor: "Project Aamhi",
        detail: "Reason and evidence fingerprinted with the amount",
        run: async (ctx) => {
          const p = v(ctx).indexer.programmes.get(v(ctx).store.programmes["PRG-MRD-BEACH-2026"].id)!;
          const amount = Math.floor(((p.acceptedGrams / p.targetGrams) * 200_000) / 100) * 100;
          ctx.state.exceptionAmount = amount;
          const { hash, sent } = await settle(ctx, () =>
            v(ctx).proposeException("PRG-MRD-BEACH-2026", "AAMHI:ORIGINATOR", {
              kind: "SETTLE",
              amountInr: amount,
              reason: `Monsoon closed Korlai shore access for five weeks; ${kg(p.acceptedGrams).toLocaleString("en-IN")} kg verified against 10,000 kg; pro-rata payment`,
              evidence: ["Tahsildar Murud shore-access closure notice (fingerprint)", "IMD Raigad red-alert bulletins, July 2026"],
            }));
          ctx.state.exceptionHash = hash;
          return { summary: `Proposed ₹${amount.toLocaleString("en-IN")} (${((p.acceptedGrams / p.targetGrams) * 100).toFixed(1)}% of target)`, refs: { programme: "PRG-MRD-BEACH-2026", tx: sent.hash } };
        },
      },
      {
        id: "neelkanth",
        label: "Neelkanth Bank Foundation approves the exact proposal",
        actor: "Neelkanth Bank Foundation",
        detail: "Approval binds to the proposal fingerprint",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).approveException("PRG-MRD-BEACH-2026", ctx.state.exceptionHash, "NEELKANTH:SPONSOR"));
          return { summary: "2 of 3 parties approved; nothing has moved yet", refs: { programme: "PRG-MRD-BEACH-2026", tx: sent.hash } };
        },
      },
      {
        id: "coastline",
        label: "Coastline Giving Circle approves: settlement executes",
        actor: "Coastline Giving Circle",
        detail: "Final approval triggers payment, payouts, claims and refund atomically",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).approveException("PRG-MRD-BEACH-2026", ctx.state.exceptionHash, "COASTLINE:SPONSOR"));
          const p = v(ctx).indexer.programmes.get(v(ctx).store.programmes["PRG-MRD-BEACH-2026"].id)!;
          return { summary: `Paid ₹${p.paidInr.toLocaleString("en-IN")}; refunded ₹${p.refundedInr.toLocaleString("en-IN")} to sponsors; status ${p.status}`, refs: { programme: "PRG-MRD-BEACH-2026", tx: sent.hash } };
        },
      },
    ],
    points: ["No administrator can release funds", "Every party approves the same exact proposal", "Outcomes are never rewritten; exceptions are recorded"],
  },
  {
    id: "scene-08",
    number: 8,
    title: "Unbundled rights",
    question: "Who owns what once the recycler buys the material?",
    narrative:
      "Talvan Polymers finds verified LDPE on the open network and buys lot VRL-MRD-2026-0042 at ₹14/kg. Delivery versus payment moves the material entitlement and the payment together. Tidewell keeps its funded-recovery claim; Talvan receives an EPR-ready supply claim, disclosed alongside it; the collectors' incentives remain paid. One physical lot, four separately governed rights.",
    surface: () => `/lots/${heroLot}`,
    steps: [
      {
        id: "discover",
        label: "Talvan discovers verified LDPE lots",
        actor: "Talvan Polymers (recycler BAP)",
        detail: "Signed Beckn search in the material-lot domain",
        run: async (ctx) => {
          const r = await ctx.beckn.recyclerSearch("LDPE");
          ctx.state.recyclerTx = r.transactionId;
          return { summary: `${r.lots.length} verified LDPE lots offered`, refs: { transactionId: r.transactionId } };
        },
      },
      {
        id: "buy",
        label: "Buy VRL-MRD-2026-0042 by delivery versus payment",
        actor: "Talvan Polymers ↔ Project Aamhi",
        detail: "Seller offers on the ledger; buyer pays and receives atomically",
        run: async (ctx) => {
          const r = await ctx.beckn.recyclerBuy({ lot: heroLot, buyer: "TALVAN", transactionId: ctx.state.recyclerTx });
          return { summary: `Order ${r.order.id}: ₹${Number(r.order.quote.price.value).toLocaleString("en-IN")} paid, entitlement transferred, EPR-ready supply claim allocated`, refs: { lot: heroLot, tx: r.settlementTx, transactionId: r.transactionId } };
        },
      },
      {
        id: "process",
        label: "Talvan attests processing into pellets",
        actor: "Talvan Polymers",
        detail: "Processing attestation completes the chain",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).recordProcessing(heroLot, 1_142_000));
          return { summary: "1,142 kg of washed, shredded and extruded LDPE pellets", refs: { lot: heroLot, tx: sent.hash } };
        },
      },
    ],
    points: ["Material, attribution and EPR use are separate rights", "Compatibility policy forces disclosure", "No double counting across claim types"],
  },
  {
    id: "scene-09",
    number: 9,
    title: "Revocation cascade",
    question: "What if we learn later that something was false?",
    narrative:
      "An audit finds Ghatmatha Recyclers' October weighbridge receipts were fabricated. The facilitator, acting on the finding, revokes those receipt attestations. Every lot that depended on them goes under review, every claim derived from them shows contested, and scanning an affected certificate now says so. History is not deleted; the correction is recorded.",
    surface: () => "/network/explorer",
    steps: [
      {
        id: "revoke",
        label: "Revoke Ghatmatha's October receipts",
        actor: "Vartul network facilitator",
        detail: "Acting on the audit finding",
        run: async (ctx) => {
          const ix = v(ctx).indexer;
          const october = [...ix.lots.values()].filter((l) => {
            const meta = v(ctx).store.lots[l.code];
            const att = ix.attestations.get(l.attestations.receipt);
            return meta?.receiver === "GHATMATHA" && att && new Date((att.at + 19_800) * 1000).toISOString().slice(0, 7) === "2026-10" && !att.revoked;
          });
          if (!october.length) throw new DomainError("No October Ghatmatha receipts found");
          const affected: string[] = [];
          for (const l of october) {
            const { affected: a } = await settle(ctx, () => v(ctx).revokeAttestation(l.attestations.receipt, "Audit finding: Ghatmatha October weighbridge slips fabricated"));
            affected.push(...a);
          }
          ctx.state.revokedLots = affected;
          const contested = [...ix.claims.values()].filter((c) => affected.includes(c.lotCode) && c.status === "CONTESTED").length;
          return { summary: `${october.length} receipts revoked; ${affected.length} lots under review; ${contested} claims now contested`, refs: { lot: affected[0] } };
        },
      },
    ],
    points: ["Corrections propagate automatically", "Certificates reflect live status", "The ledger never deletes history"],
  },
  {
    id: "scene-10",
    number: 10,
    title: "The Panchayat view",
    question: "Is the village a partner or a bystander?",
    narrative:
      "The sarpanch of Nandgaon sees what was recovered from the village, by month and material, how many local collectors are active and what they were paid in aggregate, and any open concerns. The Panchayat co-attests a new collection point. Shown in English; Marathi is a product requirement and is coming soon.",
    surface: () => "/panchayat/NDG",
    steps: [
      {
        id: "cosign",
        label: "Nandgaon GP co-attests a new collection point",
        actor: "Nandgaon Gram Panchayat",
        detail: "Signed attestation recorded on the ledger",
        run: async (ctx) => {
          const sent = await settle(ctx, () => v(ctx).panchayatCosign("GP-NDG", "collection-point:NDG-02", "New collection point at Nandgaon fish market approved by Gram Sabha"));
          return { summary: "Co-attestation recorded", refs: { tx: sent.hash } };
        },
      },
    ],
    points: ["Village-level transparency without personal data", "Panchayats co-attest and can raise concerns", "Marathi interface coming soon"],
  },
  {
    id: "scene-11",
    number: 11,
    title: "Under the hood",
    question: "What is actually on the ledger?",
    narrative:
      "The network explorer shows the token managers (recovery lots, claims, money, escrow), their supply and states, every transaction behind the scenes you just saw with decoded events, and the Beckn messages linked to ledger records. This is the Finternet pattern: assets with proof chains, programmable settlement and open networks, inspectable by anyone.",
    surface: () => "/network/explorer",
    steps: [],
    points: ["Token managers, not a single database", "Every scene reproducible from ledger events", "Simulated elements are labelled"],
  },
];

export const sceneById = (id: string) => scenes.find((s) => s.id === id);
