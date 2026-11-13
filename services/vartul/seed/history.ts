/**
 * Deterministic six-month history (1 May – 10 November 2026). Every step is a real ledger
 * transaction at a pinned timestamp; the same inputs produce the same ledger on every machine.
 */
import type { Vartul } from "../domain/vartul.js";
import { calendar, programmes, saathis, villages, receivers, heroSaathi, type Material } from "../dataset/murud.js";
import { rng, toUnix } from "../lib/util.js";

const IST = 19_800;
const DAY = 86_400;
const HOUR = 3_600;

/** Unix time for a date at an IST hour. */
const istAt = (date: string, hour: number, minute = 0) => toUnix(`${date}T00:00:00Z`) - IST + hour * HOUR + minute * 60;
const dateOf = (unix: number) => new Date((unix + IST) * 1000).toISOString().slice(0, 10);

interface Step {
  at: number;
  seq: number;
  label: string;
  run: () => Promise<void>;
}

interface StreamPlan {
  programme: string;
  prefix: string;
  org: string;
  collectors: string[];
  materials: Material[];
  firstLot: string;
  lastLot: string;
  lots: number;
  lotKg: [number, number];
  tripKg: [number, number];
  route?: (saathi: string, r: ReturnType<typeof rng>) => { village: string; route?: string };
  stopAtEligibleKg?: number;
  sellShare: number;
}

export async function seedHistory(v: Vartul, log: (msg: string) => void = () => undefined) {
  const r = rng(2026);
  const steps: Step[] = [];
  let seq = 0;
  const at = (time: number, label: string, run: () => Promise<void>) => steps.push({ at: time, seq: seq++, label, run });

  // ---- Network formation and programme commitments
  v.clock = toUnix(calendar.genesis);
  log("Deploying contracts and registering participants");
  await v.bootstrapNetwork();

  for (const p of programmes) {
    at(istAt(p.startDate, 10), `Commit ${p.id}`, async () => {
      await v.proposeProgramme(p, p.sponsors);
      for (const s of p.sponsors) await v.fundProgramme(p.id, s.code);
      v.clock! += 2 * HOUR;
      await v.acceptProgramme(p.id);
    });
  }
  // Panchayats co-attest the onboarding of Aamhi's collectors in their villages.
  villages.forEach((village, i) =>
    at(istAt("2026-05-05", 11, i * 5), `Co-attest ${village.panchayat}`, async () => {
      const ids = saathis.filter((s) => s.org === "AAMHI" && s.villages.includes(village.code)).map((s) => s.id);
      await v.panchayatCosign(village.panchayat, `onboarding:${village.code}`, `Collectors ${ids.join(", ")} are residents engaged in waste work`);
    }),
  );

  // ---- Recovery streams
  const aamhi = saathis.filter((s) => s.org === "AAMHI").map((s) => s.id);
  const beachVillages = ["KSD", "CHK", "KRL", "BRL"];
  const plans: StreamPlan[] = [
    {
      programme: "PRG-MRD-COASTAL-2026", prefix: "MRD", org: "AAMHI", collectors: aamhi,
      materials: ["LDPE", "PET", "MLP", "LDPE", "HDPE", "PET", "THERMOCOL", "GLASS"],
      firstLot: "2026-05-09", lastLot: "2026-10-30", lots: 41, lotKg: [320, 720], tripKg: [5, 13], sellShare: 0.45,
    },
    {
      programme: "PRG-MRD-BEACH-2026", prefix: "KSB", org: "AAMHI",
      collectors: saathis.filter((s) => s.org === "AAMHI" && beachVillages.some((b) => s.villages.includes(b))).map((s) => s.id),
      materials: ["FOOTWEAR", "NETS", "PET", "THERMOCOL", "NETS"],
      firstLot: "2026-06-05", lastLot: "2026-10-26", lots: 70, lotKg: [110, 185], tripKg: [5, 11], stopAtEligibleKg: 9_050, sellShare: 0,
      route: (s, rr) => {
        const v = saathis.find((x) => x.id === s)!.villages[0];
        const beach = v === "KRL" || v === "BRL" ? "Korlai shore clean-up route" : "Kashid beach clean-up route";
        return { village: v, route: rr.chance(0.8) ? beach : undefined };
      },
    },
    {
      programme: "PRG-ALB-SHORE-2026", prefix: "ALB", org: "SAGAR", collectors: saathis.filter((s) => s.org === "SAGAR").map((s) => s.id),
      materials: ["PET", "LDPE", "MLP", "HDPE"], firstLot: "2026-05-15", lastLot: "2026-11-05", lots: 110, lotKg: [85, 150], tripKg: [6, 12], sellShare: 0.3,
    },
    {
      programme: "PRG-SVD-VILLAGE-2026", prefix: "SVD", org: "HIRWAI", collectors: saathis.filter((s) => s.org === "HIRWAI").map((s) => s.id),
      materials: ["PET", "LDPE", "MLP", "GLASS"], firstLot: "2026-05-22", lastLot: "2026-11-06", lots: 100, lotKg: [80, 140], tripKg: [5, 11], sellShare: 0.25,
    },
  ];

  const challengedLot = "VRL-MRD-2026-0027";
  const rejectedLot = "VRL-SVD-2026-0058";
  let lastRecordAt = new Map<string, number>();

  for (const plan of plans) {
    const prog = programmes.find((p) => p.id === plan.programme)!;
    const commitment = istAt(prog.startDate, 12, 30);
    const first = istAt(plan.firstLot, 15);
    const last = istAt(plan.lastLot, 15);
    const spacing = (last - first) / Math.max(1, plan.lots - 1);
    let eligibleSoFar = 0;
    for (let i = 0; i < plan.lots; i++) {
      const mintAt = Math.round(first + i * spacing + r.int(-3, 3) * HOUR);
      const material = plan.materials[i % plan.materials.length];
      const targetKg = r.int(plan.lotKg[0], plan.lotKg[1]);
      const code = `VRL-${plan.prefix}-2026-${String(i + 1).padStart(4, "0")}`;
      // Plan quantities now (deterministic), execute later in calendar order.
      const contaminationRate = 0.03 + r.next() * 0.05;
      const yieldRate = 0.985 + r.next() * 0.014;
      const receiptRate = 0.986 + r.next() * 0.013;
      const eligibleRate = r.chance(0.12) ? 0.93 + r.next() * 0.04 : 0.985 + r.next() * 0.015;
      const expectedEligible = targetKg * (1 - contaminationRate) * yieldRate * receiptRate * eligibleRate;
      if (plan.stopAtEligibleKg && eligibleSoFar + expectedEligible > plan.stopAtEligibleKg) break;
      eligibleSoFar += expectedEligible;
      const windowFrom = Math.max(commitment + HOUR, (lastRecordAt.get(plan.programme) ?? commitment) + 60, mintAt - 8 * DAY);
      lastRecordAt.set(plan.programme, mintAt - 2 * HOUR);
      const seed = r.int(1, 1e9);
      const sell = plan.sellShare > 0 && r.chance(plan.sellShare) && code !== challengedLot;

      at(mintAt, `Mint ${code}`, async () => {
        const rr = rng(seed);
        const ids: string[] = [];
        let total = 0;
        while (total < targetKg * 1000) {
          const saathi = rr.pick(plan.collectors);
          const placed = plan.route ? plan.route(saathi, rr) : { village: saathis.find((s) => s.id === saathi)!.villages[0] };
          const trip = Math.round(Math.min(Math.max(rr.normal((plan.tripKg[0] + plan.tripKg[1]) / 2, 2), plan.tripKg[0] - 2), plan.tripKg[1] + 4) * 10) * 100;
          const day = windowFrom + Math.floor(rr.next() * Math.max(DAY, mintAt - 3 * HOUR - windowFrom));
          const capturedAt = istAt(dateOf(day), 7 + rr.int(0, 10), rr.int(0, 59));
          const rec = await v.captureRecord({ saathi, material, grams: trip, village: placed.village, route: placed.route, at: Math.min(Math.max(capturedAt, windowFrom), mintAt - HOUR) });
          ids.push(rec.id);
          total += rec.grams;
        }
        const contamination = Math.round(total * contaminationRate);
        const aggregated = Math.round((total - contamination) * yieldRate);
        await v.mintLot({ code, programme: plan.programme, material, recordIds: ids, contaminationGrams: contamination, aggregatedGrams: aggregated });
      });
      at(mintAt + DAY + r.int(1, 5) * HOUR, `Dispatch ${code}`, async () => {
        await v.dispatch(code, receivers[material]);
      });
      at(mintAt + 2 * DAY + r.int(1, 6) * HOUR, `Receipt ${code}`, async () => {
        const lot = v.store.lots[code];
        await v.confirmReceipt(code, Math.round(lot.aggregatedGrams * receiptRate));
      });
      const verifyAt = mintAt + 4 * DAY + r.int(1, 6) * HOUR;
      at(verifyAt, `Verify ${code}`, async () => {
        const lot = v.store.lots[code];
        const received = lot.weighSlip!.grams;
        if (code === rejectedLot) {
          await v.verifyLot(code, { eligibleGrams: 0, notes: "Bale is predominantly mixed MLP with food residue; not eligible under the programme's material definition." });
          return;
        }
        let eligible = Math.round(received * eligibleRate);
        const excluded = [];
        if (eligibleRate < 0.98) {
          const counts = new Map<string, number>();
          for (const id of lot.records) counts.set(v.store.records[id].saathi, (counts.get(v.store.records[id].saathi) ?? 0) + v.store.records[id].grams);
          const [who, grams] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          const ex = Math.min(grams, received - eligible);
          excluded.push({ saathi: who, grams: ex, reason: "Sampled bags contained non-eligible material (wet waste / mixed fractions)" });
          eligible = received - ex;
        }
        await v.verifyLot(code, { eligibleGrams: eligible, excluded });
      });
      if (code === challengedLot) {
        at(verifyAt + DAY, `Challenge ${code}`, async () => {
          await v.challengeLot(code, "GP-DND:OBSERVER", "Danda collection point was closed for Ganesh visarjan on two of the recorded days");
        });
        at(verifyAt + 2 * DAY, `Resolve ${code}`, async () => {
          const lot = v.store.lots[code];
          await v.resolveChallenge(code, lot.verification!.eligibleGrams - 38_000, "Site check: 38 kg recorded on closure days excluded; remainder confirmed");
        });
        continue;
      }
      if (code === rejectedLot) continue;
      const finalizeAt = verifyAt + 72 * HOUR + r.int(2, 30) * HOUR;
      at(finalizeAt, `Finalise ${code}`, async () => {
        await v.finalizeLot(code);
      });
      if (sell) {
        at(finalizeAt + 3 * DAY + r.int(1, 8) * HOUR, `Sell ${code}`, async () => {
          await v.sellLot(code, receivers[material]);
        });
      }
    }
  }

  const end = toUnix(calendar.historyEnd);
  const ordered = steps.filter((s) => s.at <= end).sort((a, b) => a.at - b.at || a.seq - b.seq);
  log(`Executing ${ordered.length} scheduled history steps`);
  let done = 0;
  for (const step of ordered) {
    v.clock = Math.max(v.clock ?? 0, step.at);
    try {
      await step.run();
    } catch (e) {
      throw new Error(`History step "${step.label}" at ${new Date(step.at * 1000).toISOString()} failed: ${(e as Error).message}`);
    }
    if (++done % 250 === 0) log(`  ${done}/${ordered.length} steps (${dateOf(step.at)})`);
  }

  await seedPendingField(v);
  v.clock = undefined;
}

/**
 * Field records captured but not yet aggregated at the end of the history: the batch that becomes
 * lot VRL-MRD-2026-0042 (Journey A) and the records behind the fraud scene.
 */
async function seedPendingField(v: Vartul) {
  const r = rng(42);
  // Journey A: 213 synced LDPE records from 11 collectors (2–19 October); Sunanda captures the 214th live.
  const crew = [heroSaathi, "SS-MRD-0010", "SS-MRD-0020", "SS-MRD-0009", "SS-MRD-0019", "SS-MRD-0002", "SS-MRD-0012", "SS-MRD-0003", "SS-MRD-0013", "SS-MRD-0007", "SS-MRD-0001"];
  const heroSeededGrams = 74_125 - 12_400; // Sunanda's verified share of ₹8,496 is then ₹492
  const othersGrams = 1_296_000 - 74_125;
  const plan: { saathi: string; grams: number }[] = [];
  const split = (total: number, n: number) => {
    const parts = Array.from({ length: n }, () => 0.7 + r.next() * 0.6);
    const sum = parts.reduce((a, b) => a + b, 0);
    const grams = parts.map((p) => Math.round((total * p) / sum / 100) * 100);
    grams[n - 1] += total - grams.reduce((a, b) => a + b, 0);
    return grams;
  };
  split(heroSeededGrams, 12).forEach((g) => plan.push({ saathi: heroSaathi, grams: g }));
  const otherCounts = [21, 20, 20, 21, 20, 20, 20, 20, 19, 20];
  const perCollector = split(othersGrams, 10);
  crew.slice(1).forEach((s, i) => split(perCollector[i], otherCounts[i]).forEach((g) => plan.push({ saathi: s, grams: g })));
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const day = 2 + Math.floor((i / plan.length) * 18);
    const home = saathis.find((s) => s.id === p.saathi)!.villages[0];
    await v.captureRecord({
      saathi: p.saathi,
      material: "LDPE",
      grams: p.grams,
      village: home,
      route: home === "KRL" ? "Korlai shore route" : undefined,
      at: istAt(`2026-10-${String(day).padStart(2, "0")}`, 8 + (i % 9), (i * 7) % 60),
    });
  }

  // Fraud scene: collector SS-MRD-0009 (Borli) with three anomalous records among normal PET work.
  const pet = Object.values(v.store.records).filter((x) => x.material === "PET" && x.saathi !== "SS-MRD-0009" && x.org === "AAMHI");
  const earlierPet = pet.find((x) => x.capturedAt > istAt("2026-10-12", 0) && x.capturedAt < istAt("2026-10-22", 0)) ?? pet[pet.length - 1];
  const borli = villages.find((x) => x.code === "BRL")!;
  const fraudCrew = ["SS-MRD-0009", "SS-MRD-0019", "SS-MRD-0010", "SS-MRD-0020"];
  for (let i = 0; i < 30; i++) {
    const s = fraudCrew[i % 4];
    await v.captureRecord({ saathi: s, material: "PET", grams: Math.round((7 + r.next() * 5) * 10) * 100, at: istAt(`2026-11-${String(1 + (i % 9)).padStart(2, "0")}`, 8 + (i % 8), (i * 11) % 60) });
  }
  await v.captureRecord({ saathi: "SS-MRD-0009", material: "PET", grams: 46_000, at: istAt("2026-11-07", 16, 40) });
  if (earlierPet) await v.captureRecord({ saathi: "SS-MRD-0009", material: "PET", grams: 11_800, photoSeed: earlierPet.photoSeed, at: istAt("2026-11-08", 10, 15) });
  await v.captureRecord({ saathi: "SS-MRD-0009", material: "PET", grams: 9_600, lat: borli.lat + 0.018, lng: borli.lng + 0.004, at: istAt("2026-11-08", 15, 5) });
}
