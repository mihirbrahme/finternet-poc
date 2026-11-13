import { subscriberKey } from "./signing.js";

export const DOMAINS = {
  programme: "circular:recovery-programme",
  material: "circular:material-lot",
  verification: "circular:verification-service",
} as const;
export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];

export interface Subscriber {
  subscriber_id: string;
  subscriber_url: string;
  type: "BAP" | "BPP" | "BG";
  domains: Domain[];
  participants: string[];
  name: string;
  unique_key_id: string;
  signing_public_key: string;
  city: string;
  country: "IND";
  status: "SUBSCRIBED";
  valid_from: string;
  valid_until: string;
}

/** The Vartul network registry: who is on the network, in which roles and domains, with which keys. */
export function buildRegistry(baseUrl: string): Subscriber[] {
  const entry = (
    id: string,
    type: Subscriber["type"],
    path: string,
    name: string,
    domains: Domain[],
    participants: string[],
  ): Subscriber => ({
    subscriber_id: id,
    subscriber_url: `${baseUrl}${path}`,
    type,
    domains,
    participants,
    name,
    unique_key_id: "k1",
    signing_public_key: subscriberKey(id).publicKeyB64,
    city: "std:02144",
    country: "IND",
    status: "SUBSCRIBED",
    valid_from: "2026-05-01T00:00:00Z",
    valid_until: "2027-12-31T23:59:59Z",
  });
  const all = [DOMAINS.programme, DOMAINS.material, DOMAINS.verification];
  return [
    entry("gateway.vartul.sandbox", "BG", "/beckn/gateway", "Vartul network gateway", all, ["VARTUL-NET"]),
    entry("sponsor-desk.vartul.sandbox", "BAP", "/beckn/bap/sponsor-desk.vartul.sandbox", "Vartul Sponsor Desk", [DOMAINS.programme, DOMAINS.verification], ["TIDEWELL", "NEELKANTH", "COASTLINE"]),
    entry("recycler-app.vartul.sandbox", "BAP", "/beckn/bap/recycler-app.vartul.sandbox", "Recycler Buying App", [DOMAINS.material], ["TALVAN", "GHATMATHA"]),
    entry("aamhi.bpp.vartul.sandbox", "BPP", "/beckn/bpp/aamhi.bpp.vartul.sandbox", "Project Aamhi — Murud", [DOMAINS.programme, DOMAINS.material], ["AAMHI"]),
    entry("sagar.bpp.vartul.sandbox", "BPP", "/beckn/bpp/sagar.bpp.vartul.sandbox", "Sagar Swachh Sangh — Alibag", [DOMAINS.programme, DOMAINS.material], ["SAGAR"]),
    entry("hirwai.bpp.vartul.sandbox", "BPP", "/beckn/bpp/hirwai.bpp.vartul.sandbox", "Hirwai Collective — Shrivardhan", [DOMAINS.programme, DOMAINS.material], ["HIRWAI"]),
    entry("assurance.bpp.vartul.sandbox", "BPP", "/beckn/bpp/assurance.bpp.vartul.sandbox", "Assurance catalogue (accredited verifiers)", [DOMAINS.verification], ["NIRIKSHAN", "DRISHTI"]),
  ];
}
