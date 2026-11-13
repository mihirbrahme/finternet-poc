/**
 * Vartul demonstration dataset — Murud taluka, Raigad district, Maharashtra.
 *
 * Places are real (coordinates approximate). Project Aamhi is real; every other organisation,
 * every person and all quantities are fictional or illustrative. Safai saathi names exist only
 * in the originator's private store and the simulated field app; the ledger and public views
 * see pseudonymous IDs only.
 */

export type Material =
  | "PET" | "HDPE" | "LDPE" | "MLP" | "THERMOCOL" | "GLASS" | "FOOTWEAR" | "NETS" | "RUBBER" | "TEXTILE";

export const materials: Record<Material, { label: string; family: string; pricePerKg: number; colour: string }> = {
  PET: { label: "PET bottles", family: "Plastic", pricePerKg: 22, colour: "#2563eb" },
  HDPE: { label: "HDPE rigid", family: "Plastic", pricePerKg: 26, colour: "#0891b2" },
  LDPE: { label: "LDPE film", family: "Plastic", pricePerKg: 14, colour: "#0d9488" },
  MLP: { label: "Multi-layer plastic", family: "Plastic", pricePerKg: 4, colour: "#7c3aed" },
  THERMOCOL: { label: "Thermocol / foam", family: "Plastic", pricePerKg: 6, colour: "#db2777" },
  GLASS: { label: "Glass", family: "Glass", pricePerKg: 2, colour: "#65a30d" },
  FOOTWEAR: { label: "Footwear & marine footwear", family: "Rubber", pricePerKg: 5, colour: "#ea580c" },
  NETS: { label: "Fishing nets", family: "Plastic", pricePerKg: 12, colour: "#0284c7" },
  RUBBER: { label: "Rubber", family: "Rubber", pricePerKg: 7, colour: "#a16207" },
  TEXTILE: { label: "Textiles", family: "Textile", pricePerKg: 3, colour: "#9333ea" },
};

export interface Village {
  code: string;
  name: string;
  taluka: string;
  lat: number;
  lng: number;
  households: number;
  kind: "village" | "beach";
  panchayat: string;
}

/** Aamhi's Murud villages and beaches. Coordinates approximate; household counts illustrative. */
export const villages: Village[] = [
  { code: "NDG", name: "Nandgaon", taluka: "Murud", lat: 18.3655, lng: 72.9288, households: 640, kind: "village", panchayat: "GP-NDG" },
  { code: "KSD", name: "Kashid", taluka: "Murud", lat: 18.4392, lng: 72.9046, households: 420, kind: "village", panchayat: "GP-KSD" },
  { code: "CHK", name: "Chikni", taluka: "Murud", lat: 18.4275, lng: 72.9185, households: 310, kind: "village", panchayat: "GP-CHK" },
  { code: "SRV", name: "Sarva", taluka: "Murud", lat: 18.3812, lng: 72.9472, households: 280, kind: "village", panchayat: "GP-SRV" },
  { code: "DND", name: "Danda", taluka: "Murud", lat: 18.3018, lng: 72.9655, households: 520, kind: "village", panchayat: "GP-DND" },
  { code: "VHR", name: "Vihur", taluka: "Murud", lat: 18.3441, lng: 72.9386, households: 360, kind: "village", panchayat: "GP-VHR" },
  { code: "MZG", name: "Mazgaon", taluka: "Murud", lat: 18.3561, lng: 72.9215, households: 300, kind: "village", panchayat: "GP-MZG" },
  { code: "BRS", name: "Barshiv", taluka: "Murud", lat: 18.4048, lng: 72.9602, households: 250, kind: "village", panchayat: "GP-BRS" },
  { code: "BRL", name: "Borli", taluka: "Murud", lat: 18.4719, lng: 72.9241, households: 690, kind: "village", panchayat: "GP-BRL" },
  { code: "KRL", name: "Korlai", taluka: "Murud", lat: 18.5236, lng: 72.9208, households: 580, kind: "village", panchayat: "GP-KRL" },
];

export const sites = {
  mrc: { code: "KASHID-MRC", name: "Kashid MRC", lat: 18.4351, lng: 72.9112 },
  beaches: [
    { code: "KASHID-BEACH", name: "Kashid beach", village: "KSD", lat: 18.4386, lng: 72.9031 },
    { code: "KORLAI-SHORE", name: "Korlai shore", village: "KRL", lat: 18.5205, lng: 72.9176 },
  ],
};

/** Collection areas of the two peer NGOs (approximate town centres). */
export const otherAreas: Record<string, { name: string; lat: number; lng: number }> = {
  ALIBAG: { name: "Alibag", lat: 18.6414, lng: 72.8722 },
  SHRIVARDHAN: { name: "Shrivardhan", lat: 18.0444, lng: 73.0167 },
};

export type ParticipantKind = "network" | "ngo" | "sponsor" | "recycler" | "verifier" | "assessor" | "panchayat" | "payments";

export interface Participant {
  code: string;
  name: string;
  short: string;
  kind: ParticipantKind;
  real: boolean;
  place: string;
  /** Simulated registrations presented as verifiable credentials. */
  registrations: Record<string, string>;
  /** Account keys (sandbox) and their ledger roles. The first account is the treasury. */
  accounts: { key: string; label: string; roles: Role[] }[];
}

export type Role =
  | "SPONSOR" | "ORIGINATOR" | "MRC_OPERATOR" | "SUPERVISOR" | "COLLECTOR" | "FACILITY" | "VERIFIER"
  | "PANCHAYAT" | "FACILITATOR" | "BUYER" | "RELAYER" | "ISSUER" | "ASSESSOR";

export const roleBits: Record<Role, bigint> = {
  SPONSOR: 1n << 0n, ORIGINATOR: 1n << 1n, MRC_OPERATOR: 1n << 2n, SUPERVISOR: 1n << 3n, COLLECTOR: 1n << 4n,
  FACILITY: 1n << 5n, VERIFIER: 1n << 6n, PANCHAYAT: 1n << 7n, FACILITATOR: 1n << 8n, BUYER: 1n << 9n,
  RELAYER: 1n << 10n, ISSUER: 1n << 11n, ASSESSOR: 1n << 12n,
};

export const participants: Participant[] = [
  {
    code: "VARTUL-NET", name: "Vartul Network Facilitator (Suma)", short: "Vartul", kind: "network", real: false,
    place: "Pune", registrations: { role: "Network facilitator (interim)" },
    accounts: [
      { key: "VARTUL-NET:FACILITATOR", label: "Facilitator desk", roles: ["FACILITATOR", "RELAYER"] },
      { key: "VARTUL-NET:RELAYER", label: "Transaction relayer", roles: ["RELAYER"] },
    ],
  },
  {
    code: "AAMHI", name: "Project Aamhi", short: "Aamhi", kind: "ngo", real: true, place: "Murud, Raigad",
    registrations: { csr1: "CSR00SANDBOX01", darpan: "MH/2026/SANDBOX-0001", "12A/80G": "Sandbox registration" },
    accounts: [
      { key: "AAMHI:ORIGINATOR", label: "Programme office", roles: ["ORIGINATOR"] },
      { key: "AAMHI:MRC", label: "Kashid MRC operator", roles: ["MRC_OPERATOR"] },
      { key: "AAMHI:SUPERVISOR", label: "Field supervisor (Rohan)", roles: ["SUPERVISOR"] },
    ],
  },
  {
    code: "SAGAR", name: "Sagar Swachh Sangh", short: "Sagar Swachh", kind: "ngo", real: false, place: "Alibag, Raigad",
    registrations: { csr1: "CSR00SANDBOX02", darpan: "MH/2026/SANDBOX-0002" },
    accounts: [
      { key: "SAGAR:ORIGINATOR", label: "Programme office", roles: ["ORIGINATOR"] },
      { key: "SAGAR:MRC", label: "Revdanda MRC operator", roles: ["MRC_OPERATOR"] },
    ],
  },
  {
    code: "HIRWAI", name: "Hirwai Collective", short: "Hirwai", kind: "ngo", real: false, place: "Shrivardhan, Raigad",
    registrations: { csr1: "CSR00SANDBOX03", darpan: "MH/2026/SANDBOX-0003" },
    accounts: [
      { key: "HIRWAI:ORIGINATOR", label: "Programme office", roles: ["ORIGINATOR"] },
      { key: "HIRWAI:MRC", label: "Shrivardhan MRC operator", roles: ["MRC_OPERATOR"] },
    ],
  },
  {
    code: "TIDEWELL", name: "Tidewell Foods Ltd (CSR)", short: "Tidewell Foods", kind: "sponsor", real: false, place: "Mumbai",
    registrations: { cin: "U15400MH2009PLC000000 (fictional)" },
    accounts: [{ key: "TIDEWELL:SPONSOR", label: "CSR desk", roles: ["SPONSOR"] }],
  },
  {
    code: "NEELKANTH", name: "Neelkanth Bank Foundation", short: "Neelkanth Foundation", kind: "sponsor", real: false, place: "Mumbai",
    registrations: { section8: "Sandbox Section 8 company" },
    accounts: [{ key: "NEELKANTH:SPONSOR", label: "Foundation programmes", roles: ["SPONSOR"] }],
  },
  {
    code: "COASTLINE", name: "Coastline Giving Circle", short: "Coastline Circle", kind: "sponsor", real: false, place: "Pune",
    registrations: { trust: "Sandbox public charitable trust" },
    accounts: [{ key: "COASTLINE:SPONSOR", label: "Circle coordinator", roles: ["SPONSOR"] }],
  },
  {
    code: "TALVAN", name: "Talvan Polymers Pvt Ltd", short: "Talvan Polymers", kind: "recycler", real: false, place: "Roha MIDC",
    registrations: { cpcbPwp: "PWP/SANDBOX/MH/0412" },
    accounts: [{ key: "TALVAN:FACILITY", label: "Weighbridge & stores", roles: ["FACILITY", "BUYER"] }],
  },
  {
    code: "GHATMATHA", name: "Ghatmatha Recyclers LLP", short: "Ghatmatha Recyclers", kind: "recycler", real: false, place: "Khopoli",
    registrations: { cpcbPwp: "PWP/SANDBOX/MH/0577" },
    accounts: [{ key: "GHATMATHA:FACILITY", label: "Receiving yard", roles: ["FACILITY", "BUYER"] }],
  },
  {
    code: "NIRIKSHAN", name: "Nirikshan Assurance LLP", short: "Nirikshan Assurance", kind: "verifier", real: false, place: "Pune",
    registrations: { accreditation: "Vartul verification accreditation VA-001 (sandbox)" },
    accounts: [{ key: "NIRIKSHAN:VERIFIER", label: "Lead verifier", roles: ["VERIFIER"] }],
  },
  {
    code: "DRISHTI", name: "Drishti Assurance Services", short: "Drishti Assurance", kind: "verifier", real: false, place: "Navi Mumbai",
    registrations: { accreditation: "Vartul verification accreditation VA-002 (sandbox)" },
    accounts: [{ key: "DRISHTI:VERIFIER", label: "Lead verifier", roles: ["VERIFIER"] }],
  },
  {
    code: "PRATIBIMB", name: "Pratibimb Impact Assessors", short: "Pratibimb", kind: "assessor", real: false, place: "Mumbai",
    registrations: { sse: "SSE social impact assessor (sandbox)" },
    accounts: [{ key: "PRATIBIMB:ASSESSOR", label: "Assessment lead", roles: ["ASSESSOR"] }],
  },
  {
    code: "SBX-BANK", name: "Sandbox Settlement Bank", short: "Sandbox bank", kind: "payments", real: false, place: "Sandbox",
    registrations: { note: "Simulated payment provider issuing sandbox dINR" },
    accounts: [{ key: "SBX-BANK:ISSUER", label: "dINR issuer", roles: ["ISSUER"] }],
  },
  ...villages.map<Participant>((v) => ({
    code: v.panchayat, name: `${v.name} Gram Panchayat`, short: `${v.name} GP`, kind: "panchayat", real: true,
    place: `${v.name}, Murud`, registrations: { note: "Real body; role and data illustrative" },
    accounts: [{ key: `${v.panchayat}:OBSERVER`, label: "Sarpanch / Gram Sevak", roles: ["PANCHAYAT"] }],
  })),
];

export interface Saathi {
  id: string;
  name: string;
  org: string;
  villages: string[];
  /** Typical kg per collection trip (median). */
  tripKg: number;
}

const aamhiNames = [
  "Lata", "Vaishali", "Mangal", "Sharda", "Rekha", "Shobha", "Kavita", "Sangita", "Archana", "Manisha",
  "Surekha", "Pushpa", "Jyoti", "Meena", "Asha", "Savita", "Sunanda", "Nanda", "Ujwala", "Rupali",
];

/** About 20 local women safai saathis in Aamhi's Murud team, two per village. */
export const saathis: Saathi[] = [
  ...aamhiNames.map((name, i) => ({
    id: `SS-MRD-${String(i + 1).padStart(4, "0")}`,
    name,
    org: "AAMHI",
    // Sunanda (SS-MRD-0017) works the Korlai shore route, as in Journey A of the product document.
    villages: [i === 16 ? "KRL" : villages[i % 10].code],
    tripKg: 7 + ((i * 7) % 6),
  })),
  ...["Pratibha", "Smita", "Varsha", "Kalpana", "Anita", "Vidya", "Neeta", "Sushma"].map((name, i) => ({
    id: `SS-ALB-${String(i + 1).padStart(4, "0")}`, name, org: "SAGAR", villages: ["ALIBAG"], tripKg: 8 + (i % 4),
  })),
  ...["Sarika", "Deepali", "Madhuri", "Aruna", "Swati", "Usha", "Prachi", "Komal"].map((name, i) => ({
    id: `SS-SVD-${String(i + 1).padStart(4, "0")}`, name, org: "HIRWAI", villages: ["SHRIVARDHAN"], tripKg: 7 + (i % 5),
  })),
];

/** Sunanda — the worker whose bag the demonstration follows (Journey A). */
export const heroSaathi = "SS-MRD-0017";
export const heroLot = "VRL-MRD-2026-0042";

export interface ProgrammeSpec {
  id: string;
  title: string;
  originator: string;
  verifier: string;
  sponsors: { code: string; share: number }[];
  policy: "PER_KG_CAPPED" | "FIXED_ON_TARGET";
  ratePerKg: number;
  targetKg: number;
  milestones: number;
  collectorBps: number;
  verifierBps: number;
  challengeHours: number;
  startDate: string;
  deadline: string;
  graceDays: number;
  region: string;
  materials: Material[];
  description: string;
}

/** Programmes in the seeded history. Amounts in rupees. */
export const programmes: ProgrammeSpec[] = [
  {
    id: "PRG-MRD-COASTAL-2026",
    title: "Murud Coastal Recovery 2026–27",
    originator: "AAMHI",
    verifier: "NIRIKSHAN",
    sponsors: [{ code: "TIDEWELL", share: 540_000 }],
    policy: "PER_KG_CAPPED",
    ratePerKg: 18,
    targetKg: 30_000,
    milestones: 3,
    collectorBps: 4000,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-05-04",
    deadline: "2027-03-31",
    graceDays: 60,
    region: "Murud taluka, Raigad",
    materials: ["PET", "HDPE", "LDPE", "MLP", "THERMOCOL", "GLASS"],
    description:
      "Door-to-door segregated dry-waste recovery across ten Murud villages, aggregated and baled at Kashid MRC, paid per verified kilogram.",
  },
  {
    id: "PRG-MRD-BEACH-2026",
    title: "Kashid & Korlai Shoreline Milestone 2026",
    originator: "AAMHI",
    verifier: "NIRIKSHAN",
    sponsors: [
      { code: "NEELKANTH", share: 120_000 },
      { code: "COASTLINE", share: 80_000 },
    ],
    policy: "FIXED_ON_TARGET",
    ratePerKg: 0,
    targetKg: 10_000,
    milestones: 1,
    collectorBps: 4500,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-06-01",
    deadline: "2026-12-15",
    graceDays: 30,
    region: "Kashid beach and Korlai shore",
    materials: ["FOOTWEAR", "NETS", "PET", "THERMOCOL"],
    description:
      "Beach and shoreline recovery of marine debris through the monsoon. A fixed grant of ₹2 lakh is released when 10 tonnes are verified.",
  },
  {
    id: "PRG-ALB-SHORE-2026",
    title: "Alibag & Revdanda Shoreline Plastics",
    originator: "SAGAR",
    verifier: "DRISHTI",
    sponsors: [{ code: "NEELKANTH", share: 300_000 }],
    policy: "PER_KG_CAPPED",
    ratePerKg: 16,
    targetKg: 18_750,
    milestones: 3,
    collectorBps: 3500,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-05-11",
    deadline: "2027-02-28",
    graceDays: 60,
    region: "Alibag taluka, Raigad",
    materials: ["PET", "HDPE", "LDPE", "MLP"],
    description: "Shoreline and fishing-hamlet plastics recovery from Alibag to Revdanda.",
  },
  {
    id: "PRG-SVD-VILLAGE-2026",
    title: "Shrivardhan Village Dry-Waste Programme",
    originator: "HIRWAI",
    verifier: "DRISHTI",
    sponsors: [{ code: "TIDEWELL", share: 240_000 }],
    policy: "PER_KG_CAPPED",
    ratePerKg: 15,
    targetKg: 16_000,
    milestones: 2,
    collectorBps: 4000,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-05-18",
    deadline: "2027-01-31",
    graceDays: 60,
    region: "Shrivardhan taluka, Raigad",
    materials: ["PET", "LDPE", "MLP", "GLASS"],
    description: "Village dry-waste collection and segregation in Shrivardhan, with women's collection groups.",
  },
];

/** Programme offerings published on the open network but not yet funded (scene 2). */
export const openOfferings: ProgrammeSpec[] = [
  {
    id: "PRG-MRD-NETS-2027",
    title: "Murud Fishing-Net & Marine Footwear Recovery 2027",
    originator: "AAMHI",
    verifier: "NIRIKSHAN",
    sponsors: [],
    policy: "PER_KG_CAPPED",
    ratePerKg: 20,
    targetKg: 15_000,
    milestones: 3,
    collectorBps: 4000,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-11-15",
    deadline: "2027-10-31",
    graceDays: 60,
    region: "Murud taluka, Raigad",
    materials: ["NETS", "FOOTWEAR", "RUBBER"],
    description:
      "Recovery of discarded fishing nets and marine footwear from Korlai, Borli and Danda landing sites, with Aamhi's Kashid MRC.",
  },
  {
    id: "PRG-ALB-HAMLETS-2027",
    title: "Alibag Fishing Hamlets Plastics 2027",
    originator: "SAGAR",
    verifier: "DRISHTI",
    sponsors: [],
    policy: "PER_KG_CAPPED",
    ratePerKg: 17,
    targetKg: 12_000,
    milestones: 2,
    collectorBps: 3000,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-11-15",
    deadline: "2027-09-30",
    graceDays: 60,
    region: "Alibag taluka, Raigad",
    materials: ["PET", "LDPE", "MLP"],
    description: "Plastics recovery in fishing hamlets around Alibag.",
  },
  {
    id: "PRG-SVD-SCHOOLS-2027",
    title: "Shrivardhan Schools & Market Recovery 2027",
    originator: "HIRWAI",
    verifier: "DRISHTI",
    sponsors: [],
    policy: "FIXED_ON_TARGET",
    ratePerKg: 0,
    targetKg: 8_000,
    milestones: 1,
    collectorBps: 2500,
    verifierBps: 500,
    challengeHours: 72,
    startDate: "2026-11-15",
    deadline: "2027-06-30",
    graceDays: 30,
    region: "Shrivardhan taluka, Raigad",
    materials: ["PET", "MLP"],
    description: "Weekly market and school collection drives in Shrivardhan town, fixed grant on target.",
  },
];

/** Demonstration calendar. The seeded history runs from the first programme commitment to `demoDate`. */
export const calendar = {
  genesis: "2026-05-01T04:30:00Z",
  historyEnd: "2026-11-10T12:00:00Z",
  demoDate: "2026-11-13T05:00:00Z",
};

export const receivers: Record<Material, string> = {
  PET: "TALVAN", HDPE: "GHATMATHA", LDPE: "TALVAN", MLP: "TALVAN", THERMOCOL: "TALVAN",
  GLASS: "GHATMATHA", FOOTWEAR: "TALVAN", NETS: "TALVAN", RUBBER: "TALVAN", TEXTILE: "TALVAN",
};
