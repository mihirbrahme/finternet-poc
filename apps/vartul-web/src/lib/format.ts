const IST = 19_800;

/** Rupees with Indian digit grouping: ₹5,40,000. */
export const inr = (n: number | undefined, digits = 0) =>
  n === undefined || Number.isNaN(n) ? "—" : `₹${n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/** Compact rupees: ₹5.4 L, ₹1.2 Cr. */
export const inrShort = (n: number) => {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  return inr(n);
};

export const kg = (n: number | undefined, digits?: number) => {
  if (n === undefined || Number.isNaN(n)) return "—";
  const d = digits ?? (Math.abs(n) < 100 ? 1 : 0);
  return `${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: d })} kg`;
};

export const num = (n: number, digits = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: digits });
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ist = (unix: number) => new Date((unix + IST) * 1000);

export const date = (unix?: number) => {
  if (!unix) return "—";
  const d = ist(unix);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export const dateTime = (unix?: number) => {
  if (!unix) return "—";
  const d = ist(unix);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} IST`;
};
export const shortDate = (unix?: number) => {
  if (!unix) return "—";
  const d = ist(unix);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
export const month = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
export const monthShort = (ym: string) => MONTHS[Number(ym.split("-")[1]) - 1];

export const short = (h?: string, n = 6) => (!h ? "—" : h.length > 2 * n + 4 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h);

export const duration = (seconds: number) => {
  if (seconds <= 0) return "elapsed";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h ${m} min`;
};

/** Lot lifecycle states in plain language, with a tone for badges. */
export const lotStates: Record<string, { label: string; tone: string }> = {
  MINTED: { label: "Aggregated", tone: "neutral" },
  IN_TRANSIT: { label: "In transit", tone: "neutral" },
  RECEIVED: { label: "Received", tone: "brand" },
  VERIFIED: { label: "Verified, in challenge window", tone: "brand" },
  CHALLENGED: { label: "Challenged", tone: "warning" },
  SETTLED: { label: "Settled", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  UNDER_REVIEW: { label: "Under review", tone: "warning" },
  VOIDED: { label: "Voided", tone: "danger" },
};

export const claimTones: Record<string, string> = { VALID: "success", PENDING: "neutral", CONTESTED: "warning", REVOKED: "danger", INVALID: "danger" };
export const claimTypes: Record<string, string> = {
  FUNDED_RECOVERY: "Funded recovery",
  EPR_READY_SUPPLY: "EPR-ready supply",
  OBP_READY_RECOVERY: "Plastic-credit ready",
  PROCESSING_CONFIRMED: "Processing confirmed",
};
export const programmeTones: Record<string, string> = { PROPOSED: "neutral", ACTIVE: "brand", DISPUTED: "warning", RESOLVED: "success", COMPLETED: "success", EXPIRED: "danger", CANCELLED: "danger" };
export const policyLabels: Record<string, string> = { PER_KG_CAPPED: "Per kg, capped", FIXED_ON_TARGET: "Fixed on target" };
