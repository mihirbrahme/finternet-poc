import type { Material, ProgrammeSpec } from "../dataset/murud.js";
import type { Addresses } from "../chain/chain.js";

/** A safai saathi's signed collection record. Personal data stays off-ledger. */
export interface CollectionRecord {
  id: string;
  saathi: string;
  org: string;
  village: string;
  route: string;
  material: Material;
  grams: number;
  capturedAt: number;
  lat: number;
  lng: number;
  gpsAccuracyM: number;
  photoSeed: string;
  photoHash: string;
  scale: string;
  fingerprint: string;
  deviceSignature: string;
  supervisorSignature?: string;
  syncedAt?: number;
  lot?: string;
  assisted?: boolean;
}

export interface Exclusion {
  saathi: string;
  grams: number;
  reason: string;
}

export interface LotMeta {
  code: string;
  id: string;
  programme: string;
  originator: string;
  material: Material;
  records: string[];
  villages: string[];
  receiver?: string;
  inputGrams: number;
  contaminationGrams: number;
  aggregatedGrams: number;
  windowStart: number;
  windowEnd: number;
  proofRoot: string;
  bale: string;
  transportDoc?: { vehicle: string; document: string; hash: string };
  weighSlip?: { slip: string; grams: number; hash: string };
  verification?: {
    sampled: string[];
    excluded: Exclusion[];
    eligibleGrams: number;
    report: string;
    reportHash: string;
    notes: string;
  };
  challenge?: { by: string; reason: string; at: number; resolution?: string };
  review?: { reason: string; at: number; outcome?: string };
  sale?: { buyer: string; priceInr: number; offerId: number };
}

export interface ProgrammeMeta {
  code: string;
  id: string;
  spec: ProgrammeSpec;
  termsDocument: Record<string, unknown>;
  termsHash: string;
  becknOrderId?: string;
  becknTransactionId?: string;
}

export interface TxMeta {
  hash: string;
  action: string;
  actor: string;
  participant: string;
  at: number;
  block: number;
  scene?: string;
  subject?: string;
}

export interface Payout {
  id: string;
  txHash: string;
  lot: string;
  programme: string;
  saathi: string;
  account: string;
  amountInr: number;
  grams: number;
  vpa: string;
  utr: string;
  status: "SUCCESS" | "PENDING";
  initiatedAt: number;
  completedAt: number;
}

export interface IssuedCredential {
  id: string;
  type: string;
  issuer: string;
  subject: string;
  jwt: string;
  statusIndex: number;
  issuedAt: number;
  summary: Record<string, unknown>;
}

export interface ExceptionMeta {
  hash: string;
  programme: string;
  kind: "SETTLE" | "EXTEND" | "RESUME";
  amountInr: number;
  reason: string;
  evidence: string[];
  proposedBy: string;
  approvals: string[];
  executed: boolean;
  superseded?: boolean;
  at: number;
}

export interface BecknLogEntry {
  id: string;
  at: number;
  direction: "request" | "callback";
  action: string;
  domain: string;
  transactionId: string;
  messageId: string;
  from: string;
  to: string;
  signatureValid: boolean;
  authorization: string;
  digest: string;
  body: unknown;
}

export interface Store {
  version: 1;
  snapshot: string;
  sceneTime: number;
  deployment?: Addresses;
  records: Record<string, CollectionRecord>;
  lots: Record<string, LotMeta>;
  programmes: Record<string, ProgrammeMeta>;
  txs: Record<string, TxMeta>;
  payouts: Payout[];
  credentials: Record<string, IssuedCredential>;
  statusList: { revoked: number[]; next: number };
  exceptions: Record<string, ExceptionMeta>;
  beckn: BecknLogEntry[];
  assistant: { at: number; mode: string; prompt: string; tools: string[] }[];
  counters: Record<string, number>;
  scene?: string;
  /** Presenter progress and values carried between steps of a scene (e.g. a Beckn transaction id). */
  sceneProgress: Record<string, number>;
  sceneState: Record<string, any>;
}

export const emptyStore = (): Store => ({
  version: 1,
  snapshot: "fresh",
  sceneTime: 0,
  records: {},
  lots: {},
  programmes: {},
  txs: {},
  payouts: [],
  credentials: {},
  statusList: { revoked: [], next: 0 },
  exceptions: {},
  beckn: [],
  assistant: [],
  counters: {},
  sceneProgress: {},
  sceneState: {},
});
