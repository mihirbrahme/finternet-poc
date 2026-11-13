import { sites, villages } from "../dataset/murud.js";
import { haversineMetres } from "./evidence.js";
import type { CollectionRecord, LotMeta, Store } from "./store.js";
import { rng } from "../lib/util.js";

export interface Flag {
  code: "WEIGHT_OUTLIER" | "DUPLICATE_PHOTO" | "GPS_OFF_ROUTE" | "ODD_HOURS" | "MASS_BALANCE_NEAR_LIMIT" | "RECEIPT_VARIANCE" | "FLAGGED_RECORDS";
  severity: "high" | "medium" | "low";
  explanation: string;
  related?: string[];
}

/** Off-ledger anomaly engine. It flags; people decide. Flags never change ledger state by themselves. */
export class AnomalyEngine {
  private cacheKey = "";
  private cache = new Map<string, Flag[]>();

  constructor(private store: () => Store) {}

  recordFlags(): Map<string, Flag[]> {
    const records = Object.values(this.store().records);
    const key = `${records.length}:${records[records.length - 1]?.id ?? ""}`;
    if (key === this.cacheKey) return this.cache;
    const flags = new Map<string, Flag[]>();
    const add = (id: string, f: Flag) => flags.set(id, [...(flags.get(id) ?? []), f]);

    const bySaathi = new Map<string, number[]>();
    for (const r of records) bySaathi.set(r.saathi, [...(bySaathi.get(r.saathi) ?? []), r.grams]);
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)] ?? 0;
    };
    const medians = new Map([...bySaathi].map(([k, v]) => [k, median(v)]));

    const photos = new Map<string, CollectionRecord>();
    for (const r of [...records].sort((a, b) => a.capturedAt - b.capturedAt)) {
      const m = medians.get(r.saathi) ?? 0;
      if (m > 0 && r.grams > Math.max(3 * m, m + 20_000)) {
        add(r.id, {
          code: "WEIGHT_OUTLIER",
          severity: "high",
          explanation: `${(r.grams / 1000).toFixed(1)} kg on one trip; this collector's median trip is ${(m / 1000).toFixed(1)} kg.`,
        });
      }
      const earlier = photos.get(r.photoHash);
      if (earlier && earlier.id !== r.id) {
        add(r.id, {
          code: "DUPLICATE_PHOTO",
          severity: "high",
          explanation: `Photo fingerprint matches record ${earlier.id} by ${earlier.saathi}, captured ${Math.round((r.capturedAt - earlier.capturedAt) / 86400)} days earlier.`,
          related: [earlier.id],
        });
      } else photos.set(r.photoHash, r);

      const anchor = this.anchor(r);
      if (anchor) {
        const d = haversineMetres(r.lat, r.lng, anchor.lat, anchor.lng);
        if (d > 1500) {
          add(r.id, {
            code: "GPS_OFF_ROUTE",
            severity: "medium",
            explanation: `Location fix is ${(d / 1000).toFixed(1)} km from the assigned ${anchor.name} route.`,
          });
        }
      }
      const hourIst = new Date((r.capturedAt + 19_800) * 1000).getUTCHours();
      if (hourIst < 6 || hourIst >= 21) {
        add(r.id, { code: "ODD_HOURS", severity: "low", explanation: `Captured at ${hourIst}:00 IST, outside route hours.` });
      }
    }
    this.cache = flags;
    this.cacheKey = key;
    return flags;
  }

  private anchor(r: CollectionRecord) {
    if (r.route.includes("Kashid beach")) return sites.beaches[0];
    if (r.route.includes("Korlai shore")) return sites.beaches[1];
    const v = villages.find((x) => x.code === r.village);
    return v ? { name: v.name, lat: v.lat, lng: v.lng } : undefined;
  }

  lotFlags(lot: LotMeta, receivedGrams?: number): Flag[] {
    const out: Flag[] = [];
    const rf = this.recordFlags();
    const flagged = lot.records.filter((id) => (rf.get(id) ?? []).some((f) => f.severity !== "low"));
    if (flagged.length) {
      out.push({
        code: "FLAGGED_RECORDS",
        severity: "high",
        explanation: `${flagged.length} of ${lot.records.length} collection records carry anomaly flags; all are in the sampling plan.`,
        related: flagged,
      });
    }
    const net = lot.inputGrams - lot.contaminationGrams;
    if (net > 0 && lot.aggregatedGrams > net) {
      out.push({
        code: "MASS_BALANCE_NEAR_LIMIT",
        severity: "medium",
        explanation: `Weighed lot is ${((lot.aggregatedGrams / net) * 100).toFixed(2)}% of captured inputs net of contamination: above inputs, inside the 1% scale tolerance.`,
      });
    }
    if (receivedGrams && lot.aggregatedGrams) {
      const variance = (lot.aggregatedGrams - receivedGrams) / lot.aggregatedGrams;
      if (Math.abs(variance) > 0.015) {
        out.push({
          code: "RECEIPT_VARIANCE",
          severity: "medium",
          explanation: `Recycler weighbridge differs from MRC weight by ${(variance * 100).toFixed(1)}% (programme tolerance 2%).`,
        });
      }
    }
    return out;
  }

  /** Risk-weighted sampling plan: every flagged record plus a deterministic random sample. */
  samplingPlan(lot: LotMeta, size = 12): { record: string; reason: string }[] {
    const rf = this.recordFlags();
    const plan = lot.records
      .filter((id) => (rf.get(id) ?? []).some((f) => f.severity !== "low"))
      .map((id) => ({ record: id, reason: (rf.get(id) ?? []).map((f) => f.code).join(", ") }));
    const r = rng(parseInt(lot.id.slice(2, 10), 16));
    const pool = lot.records.filter((id) => !plan.some((p) => p.record === id));
    while (plan.length < Math.min(size + plan.length, lot.records.length) && pool.length) {
      const [id] = pool.splice(r.int(0, pool.length - 1), 1);
      plan.push({ record: id, reason: "Random sample" });
      if (plan.filter((p) => p.reason === "Random sample").length >= size) break;
    }
    return plan;
  }
}
