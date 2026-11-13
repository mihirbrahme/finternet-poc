import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { Router, send } from "../api/http.js";
import type { Runtime } from "../runtime.js";
import { buildRegistry, DOMAINS, type Domain, type Subscriber } from "./registry.js";
import { authorizationHeader, subscriberKey, verifyAuthorization, blakeDigest } from "./signing.js";
import { openOfferings, programmes as seededProgrammes, materials, participants, type ProgrammeSpec } from "../dataset/murud.js";
import { DomainError, idOf, kg } from "../lib/util.js";
import type { BecknLogEntry } from "../domain/store.js";

const BECKN_VERSION = "1.1.0";

interface Envelope {
  context: {
    domain: Domain;
    action: string;
    version: string;
    bap_id: string;
    bap_uri: string;
    bpp_id?: string;
    bpp_uri?: string;
    transaction_id: string;
    message_id: string;
    timestamp: string;
    ttl: string;
    location: { country: { code: "IND" }; city: { code: string } };
  };
  message: any;
  error?: { code: string; message: string };
}

/**
 * Beckn-aligned network sandbox. Buyer-side apps (BAPs), provider apps (BPPs) and the gateway
 * exchange signed messages over HTTP with asynchronous callbacks. Keys come from the registry.
 */
export class BecknNetwork {
  readonly registry: Subscriber[];
  private waiters = new Map<string, { envelopes: Envelope[]; resolve?: () => void }>();

  constructor(private rt: Runtime, private baseUrl: string, private internalUrl: string) {
    this.registry = buildRegistry(baseUrl);
  }

  private get v() {
    return this.rt.vartul;
  }

  lookup(id: string) {
    return this.registry.find((s) => s.subscriber_id === id);
  }

  private internal(sub: Subscriber) {
    return sub.subscriber_url.replace(this.baseUrl, this.internalUrl);
  }

  private bppFor(participant: string) {
    return this.registry.find((s) => s.type === "BPP" && s.participants.includes(participant));
  }

  // ------------------------------------------------------------------ transport

  private async now() {
    return this.v.chain.latestTimestamp();
  }

  private async post(from: Subscriber, url: string, envelope: Envelope, extraHeaders: Record<string, string> = {}) {
    const body = JSON.stringify(envelope);
    const { header } = authorizationHeader(from.subscriber_id, from.unique_key_id, subscriberKey(from.subscriber_id), body, await this.now());
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: header, ...extraHeaders }, body });
    return res.json();
  }

  private async log(direction: BecknLogEntry["direction"], envelope: Envelope, authorization: string, body: string, valid: boolean, from: string, to: string) {
    this.v.store.beckn.push({
      id: randomUUID(),
      at: await this.now(),
      direction,
      action: envelope.context.action,
      domain: envelope.context.domain,
      transactionId: envelope.context.transaction_id,
      messageId: envelope.context.message_id,
      from,
      to,
      signatureValid: valid,
      authorization,
      digest: blakeDigest(body),
      body: envelope,
    });
    if (this.v.store.beckn.length > 2000) this.v.store.beckn.splice(0, this.v.store.beckn.length - 2000);
  }

  /** Authenticate an inbound message: signer must be registered, subscribed and the expected party. */
  private async authenticate(req: IncomingMessage, raw: string, expected: string) {
    const auth = req.headers.authorization as string | undefined;
    const sub = this.lookup(expected);
    if (!sub) return { ok: false, reason: `Unknown subscriber ${expected}`, auth: auth ?? "" };
    const check = verifyAuthorization(auth, raw, sub.signing_public_key, await this.now());
    if (check.ok && check.subscriberId !== expected) return { ok: false, reason: "Signer is not the context subscriber", auth: auth ?? "" };
    return { ...check, auth: auth ?? "" };
  }

  // ------------------------------------------------------------------ BAP client

  async request(bapId: string, action: string, domain: Domain, message: unknown, opts: { bppId?: string; transactionId?: string; collectMs?: number } = {}) {
    const bap = this.lookup(bapId)!;
    const transactionId = opts.transactionId ?? randomUUID();
    const messageId = randomUUID();
    const envelope: Envelope = {
      context: {
        domain,
        action,
        version: BECKN_VERSION,
        bap_id: bap.subscriber_id,
        bap_uri: bap.subscriber_url,
        transaction_id: transactionId,
        message_id: messageId,
        timestamp: new Date((await this.now()) * 1000).toISOString(),
        ttl: "PT30S",
        location: { country: { code: "IND" }, city: { code: "std:02144" } },
        ...(opts.bppId ? { bpp_id: opts.bppId, bpp_uri: this.lookup(opts.bppId)!.subscriber_url } : {}),
      },
      message,
    };
    const key = `${transactionId}:on_${action}`;
    const slot: { envelopes: Envelope[]; resolve?: () => void } = { envelopes: [] };
    this.waiters.set(key, slot);
    const target = opts.bppId ? this.lookup(opts.bppId)! : this.lookup("gateway.vartul.sandbox")!;
    const ack = await this.post(bap, `${this.internal(target)}/${action}`, envelope);
    if (ack?.message?.ack?.status !== "ACK") {
      this.waiters.delete(key);
      throw new DomainError(`${action} was not acknowledged: ${ack?.error?.message ?? "NACK"}`, 502);
    }
    const expected = opts.bppId ? 1 : this.registry.filter((s) => s.type === "BPP" && s.domains.includes(domain)).length;
    await new Promise<void>((resolve) => {
      slot.resolve = () => slot.envelopes.length >= expected && resolve();
      setTimeout(resolve, opts.collectMs ?? 6000);
      slot.resolve();
    });
    this.waiters.delete(key);
    return { transactionId, messageId, callbacks: slot.envelopes, messages: this.transactionLog(transactionId) };
  }

  transactionLog(transactionId: string) {
    return this.v.store.beckn
      .filter((m) => m.transactionId === transactionId)
      .map((m) => ({ ...m, body: m.body }));
  }

  // ------------------------------------------------------------------ BPP behaviour

  private trackRecord(participant: string) {
    const ix = this.v.indexer;
    const lots = [...ix.lots.values()].filter((l) => l.originator === participant);
    const progs = [...ix.programmes.values()].filter((p) => p.originator === participant);
    const payouts = this.v.store.payouts.filter((p) => this.v.store.lots[p.lot]?.originator === participant);
    return {
      source: "ledger",
      note: "Derived from the Vartul ledger, not self-reported. Any BAP can re-derive it from the claim registry and lot registry.",
      verifiedKg: kg(lots.filter((l) => ["VERIFIED", "SETTLED"].includes(l.state)).reduce((s, l) => s + l.eligibleGrams, 0)),
      lots: lots.length,
      programmes: progs.length,
      programmesCompleted: progs.filter((p) => ["COMPLETED", "RESOLVED"].includes(p.status)).length,
      collectorsPaid: new Set(payouts.map((p) => p.saathi)).size,
      collectorIncentivesInr: Math.round(payouts.reduce((s, p) => s + p.amountInr, 0)),
      contestedOrRevokedClaims: [...ix.claims.values()].filter((c) => lots.some((l) => l.id === c.lotId) && c.status !== "VALID").length,
      ledger: { lotRegistry: this.v.chain.addresses!.RecoveryLotRegistry, claimRegistry: this.v.chain.addresses!.VartulClaims, chainId: 31337 },
    };
  }

  private provider(participant: string) {
    const p = participants.find((x) => x.code === participant)!;
    const cred = this.v.store.credentials[`PC-${participant}`];
    return {
      id: participant,
      descriptor: { name: p.name, short_desc: p.place },
      credentials: cred ? [{ id: cred.id, type: cred.type, verify_url: `${this.baseUrl}/verify/${cred.id}` }] : [],
      registrations: p.registrations,
      tags: { track_record: this.trackRecord(participant) },
    };
  }

  private offeringOpen(spec: ProgrammeSpec) {
    const meta = this.v.store.programmes[spec.id];
    if (!meta) return true;
    const proj = this.v.indexer.programmes.get(meta.id);
    return !proj || proj.status === "PROPOSED";
  }

  private programmeItem(spec: ProgrammeSpec) {
    return {
      id: spec.id,
      descriptor: { name: spec.title, short_desc: spec.description },
      price: spec.policy === "PER_KG_CAPPED" ? { currency: "INR", value: String(spec.ratePerKg), unit: "per verified kg" } : { currency: "INR", value: "fixed", unit: "grant on verified target" },
      quantity: { target: { unit: "kg", value: String(spec.targetKg) } },
      tags: {
        payment_policy: spec.policy,
        split_bps: { collectors: spec.collectorBps, verifier: spec.verifierBps, originator: 10_000 - spec.collectorBps - spec.verifierBps },
        verifier: { id: spec.verifier, name: this.v.actors.participantName(spec.verifier) },
        materials: spec.materials,
        region: spec.region,
        challenge_window_hours: spec.challengeHours,
        milestones: spec.milestones,
        deadline: spec.deadline,
      },
    };
  }

  private materialItems(participant: string, material?: string) {
    return [...this.v.indexer.lots.values()]
      .filter((l) => l.originator === participant && l.state === "SETTLED" && !this.v.store.lots[l.code]?.sale)
      .filter((l) => !material || this.v.store.lots[l.code]?.material === material)
      .slice(0, 12)
      .map((l) => {
        const meta = this.v.store.lots[l.code];
        return {
          id: l.code,
          descriptor: { name: `${materials[meta.material].label} — ${l.code}`, short_desc: `${kg(l.eligibleGrams)} kg verified, ${meta.villages.length} villages` },
          price: { currency: "INR", value: String(materials[meta.material].pricePerKg), unit: "per kg" },
          quantity: { available: { unit: "kg", value: String(kg(l.eligibleGrams)) } },
          tags: {
            material: meta.material,
            proof_root: l.proofRoot,
            verifier: this.v.store.programmes[meta.programme]?.spec.verifier,
            funded_recovery_claim_held_by: [...new Set(l.claims.map((c) => this.v.indexer.claims.get(c)?.holderParticipant))].filter(Boolean),
            epr_ready_supply_claim: "Allocated to the buyer on settlement",
            ledger_token_id: l.id,
          },
        };
      });
  }

  private async handleProvider(sub: Subscriber, action: string, env: Envelope): Promise<unknown> {
    const participant = sub.participants[0];
    const domain = env.context.domain;
    const msg = env.message ?? {};
    if (domain === DOMAINS.verification) {
      if (action !== "search") throw new DomainError("Assurance catalogue supports discovery only in the sandbox");
      return {
        catalog: {
          descriptor: { name: sub.name },
          providers: sub.participants.map((code) => {
            const p = participants.find((x) => x.code === code)!;
            const lots = [...this.v.indexer.lots.values()].filter((l) => this.v.store.programmes[this.v.store.lots[l.code]?.programme]?.spec.verifier === code);
            return {
              id: code,
              descriptor: { name: p.name, short_desc: p.place },
              credentials: this.v.store.credentials[`PC-${code}`] ? [{ id: `PC-${code}`, verify_url: `${this.baseUrl}/verify/PC-${code}` }] : [],
              items: [{
                id: `${code}-STD-VERIFICATION`,
                descriptor: { name: "Lot verification under the Vartul verification standard v1", short_desc: "Proof-chain review, risk-weighted sampling, weighbridge reconciliation, site checks" },
                price: { currency: "INR", value: "5", unit: "% of programme payments released" },
                tags: { accreditation: p.registrations.accreditation, regions: ["Raigad"], lots_verified: lots.filter((l) => l.eligibleGrams > 0).length, conflict_of_interest_declaration: "Per programme" },
              }],
            };
          }),
        },
      };
    }
    if (domain === DOMAINS.programme) {
      const specs = [...openOfferings, ...seededProgrammes].filter((s) => s.originator === participant);
      if (action === "search") {
        const tags = msg.intent?.tags ?? {};
        const items = openOfferings
          .filter((s) => s.originator === participant && this.offeringOpen(s))
          .filter((s) => !tags.materials?.length || s.materials.some((m) => tags.materials.includes(m)))
          .filter((s) => !tags.min_collector_share_bps || s.collectorBps >= tags.min_collector_share_bps)
          .map((s) => this.programmeItem(s));
        return { catalog: { descriptor: { name: sub.name }, providers: [{ ...this.provider(participant), items }] } };
      }
      const itemId = msg.order?.items?.[0]?.id;
      const spec = specs.find((s) => s.id === itemId);
      if (!spec) throw new DomainError(`Unknown item ${itemId}`, 404);
      const funding = Number(msg.order?.items?.[0]?.quantity?.selected?.value ?? 0);
      if (action === "select") {
        if (!(funding >= 50_000)) throw new DomainError("Minimum funding commitment is ₹50,000");
        const collectors = Math.round((funding * spec.collectorBps) / 10_000);
        const verifier = Math.round((funding * spec.verifierBps) / 10_000);
        return {
          order: {
            provider: { id: participant },
            items: [this.programmeItem(spec)],
            quote: {
              price: { currency: "INR", value: String(funding) },
              breakup: [
                { title: "Collector incentives (safai saathis)", price: { currency: "INR", value: String(collectors) } },
                { title: `${this.v.actors.participantName(participant)} programme operations`, price: { currency: "INR", value: String(funding - collectors - verifier) } },
                { title: `Independent verification (${this.v.actors.participantName(spec.verifier)})`, price: { currency: "INR", value: String(verifier) } },
              ],
              funded_quantity: spec.policy === "PER_KG_CAPPED" ? { unit: "kg", value: String(Math.floor(funding / spec.ratePerKg)) } : { unit: "kg", value: String(spec.targetKg) },
              tranches: Array.from({ length: spec.milestones }, (_, i) => ({ milestone: i + 1, value: String(Math.round(funding / spec.milestones)) })),
            },
          },
        };
      }
      const sponsor = msg.order?.billing?.participant as string;
      if (!sponsor) throw new DomainError("Billing participant is required");
      const terms = this.v.termsDocument(spec, [{ code: sponsor, share: funding }]);
      if (action === "init") {
        const { fingerprint } = await import("../lib/util.js");
        return {
          order: {
            provider: { id: participant },
            items: [{ id: spec.id }],
            billing: msg.order.billing,
            terms: { document: terms, fingerprint: fingerprint(terms), signing_note: "Both parties sign this fingerprint: the sponsor by proposing and funding, the originator by accepting on the ledger." },
            payment: { type: "PROGRAMME_ESCROW", collected_by: "LEDGER", escrow: this.v.chain.addresses!.ProgrammeEscrow, currency: "dINR (sandbox)", status: "NOT-PAID" },
          },
        };
      }
      if (action === "confirm") {
        // The sponsor has proposed and funded on the ledger; the originator verifies and accepts the exact terms.
        const meta = this.v.store.programmes[spec.id];
        const proj = meta && this.v.indexer.programmes.get(meta.id);
        if (!meta || !proj) throw new DomainError("Programme not found on the ledger; propose and fund first");
        if (proj.status !== "PROPOSED" || proj.fundedInr !== proj.budgetInr) throw new DomainError(`Programme is ${proj.status}, funded ₹${proj.fundedInr} of ₹${proj.budgetInr}`);
        const sent = await this.rt.exclusive(async () => {
          const s = await this.v.acceptProgramme(spec.id);
          await this.v.sync();
          return s;
        });
        const orderId = `ORD-${spec.id.slice(4)}-${env.context.transaction_id.slice(0, 8).toUpperCase()}`;
        meta.becknOrderId = orderId;
        meta.becknTransactionId = env.context.transaction_id;
        return {
          order: {
            id: orderId,
            state: "ACTIVE",
            provider: { id: participant },
            items: [{ id: spec.id }],
            ledger: { programme_id: meta.id, terms_fingerprint: meta.termsHash, commitment_tx: sent.hash, commitment_time: new Date(sent.timestamp * 1000).toISOString(), escrow: this.v.chain.addresses!.ProgrammeEscrow },
            payment: { status: "HELD_IN_ESCROW", amount: { currency: "INR", value: String(proj.fundedInr) } },
          },
        };
      }
      if (action === "status") {
        const meta = this.v.store.programmes[spec.id];
        const proj = meta && this.v.indexer.programmes.get(meta.id);
        return { order: { id: meta?.becknOrderId, state: proj?.status, held_inr: proj ? proj.fundedInr - proj.paidInr - proj.refundedInr : 0, released_inr: proj?.paidInr, verified_kg: kg(proj?.acceptedGrams ?? 0), ledger: { programme_id: meta?.id } } };
      }
    }
    if (domain === DOMAINS.material) {
      if (action === "search") {
        return { catalog: { descriptor: { name: sub.name }, providers: [{ ...this.provider(participant), items: this.materialItems(participant, msg.intent?.item?.descriptor?.code) }] } };
      }
      const lotCode = msg.order?.items?.[0]?.id as string;
      const lot = this.v.store.lots[lotCode];
      if (!lot || lot.originator !== participant) throw new DomainError(`Unknown lot ${lotCode}`, 404);
      const price = this.v.lotPrice(lotCode);
      if (action === "select" || action === "init") {
        return { order: { provider: { id: participant }, items: [{ id: lotCode }], quote: { price: { currency: "INR", value: String(price) }, breakup: [{ title: `${kg(lot.verification?.eligibleGrams ?? 0)} kg × ₹${materials[lot.material].pricePerKg}/kg`, price: { currency: "INR", value: String(price) } }] }, payment: { type: "DELIVERY_VERSUS_PAYMENT", contract: this.v.chain.addresses!.MaterialSettlement } } };
      }
      if (action === "confirm") {
        const buyer = msg.order?.billing?.participant as string;
        const { sent, offerId } = await this.rt.exclusive(async () => {
          const r = await this.v.offerLot(lotCode, buyer, price);
          await this.v.sync();
          return r;
        });
        return { order: { id: `ORD-${lotCode.slice(4)}`, state: "AWAITING_PAYMENT", items: [{ id: lotCode }], ledger: { offer_id: offerId, offer_tx: sent.hash, settlement: "Buyer settles by delivery versus payment" }, quote: { price: { currency: "INR", value: String(price) } } } };
      }
    }
    throw new DomainError(`Unsupported ${domain} action ${action}`);
  }

  // ------------------------------------------------------------------ routes

  routes(router: Router) {
    const raw = async (req: IncomingMessage) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      return Buffer.concat(chunks).toString("utf8");
    };
    const ack = { message: { ack: { status: "ACK" } } };
    const nack = (reason: string) => ({ message: { ack: { status: "NACK" } }, error: { code: "30016", message: reason } });

    router.get("/beckn/registry", () => this.registry);
    router.post("/beckn/registry/lookup", ({ body }) =>
      this.registry.filter((s) => (!body.subscriber_id || s.subscriber_id === body.subscriber_id) && (!body.type || s.type === body.type) && (!body.domain || s.domains.includes(body.domain))));
    router.get("/api/beckn/log", ({ query }) => {
      const t = query.get("transaction");
      return (t ? this.transactionLog(t) : this.v.store.beckn.slice(-100)).slice().reverse();
    });

    // Raw signed endpoints bypass the JSON helper so the digest covers the exact bytes received.
    const handleRaw = async (req: IncomingMessage, res: import("node:http").ServerResponse, kind: "gateway" | "bpp" | "bap", id: string, action: string) => {
      const body = await raw(req);
      let env: Envelope;
      try {
        env = JSON.parse(body);
      } catch {
        return send(res, 400, nack("Invalid JSON"));
      }
      const sender = kind === "bap" ? env.context.bpp_id! : env.context.bap_id;
      const auth = await this.authenticate(req, body, sender);
      await this.log(kind === "bap" ? "callback" : "request", env, auth.auth, body, auth.ok, sender, kind === "gateway" ? "gateway.vartul.sandbox" : id);
      if (!auth.ok) return send(res, 401, nack(`Authentication failed: ${"reason" in auth ? auth.reason : ""}`));

      if (kind === "gateway") {
        if (action !== "search") return send(res, 400, nack("Gateway only broadcasts search"));
        send(res, 200, ack);
        const gateway = this.lookup("gateway.vartul.sandbox")!;
        const targets = this.registry.filter((s) => s.type === "BPP" && s.domains.includes(env.context.domain));
        const { header } = authorizationHeader(gateway.subscriber_id, gateway.unique_key_id, subscriberKey(gateway.subscriber_id), body, await this.now());
        for (const t of targets) {
          fetch(`${this.internal(t)}/search`, { method: "POST", headers: { "content-type": "application/json", authorization: req.headers.authorization as string, "x-gateway-authorization": header }, body }).catch(() => undefined);
        }
        return;
      }
      if (kind === "bpp") {
        const sub = this.lookup(id);
        if (!sub || sub.type !== "BPP" || !sub.domains.includes(env.context.domain)) return send(res, 404, nack("Unknown provider or domain"));
        send(res, 200, ack);
        setImmediate(async () => {
          let message: unknown;
          let error: Envelope["error"];
          try {
            message = await this.handleProvider(sub, action, env);
          } catch (e) {
            error = { code: "40000", message: (e as Error).message };
          }
          const callback: Envelope = { context: { ...env.context, action: `on_${action}`, bpp_id: sub.subscriber_id, bpp_uri: sub.subscriber_url, message_id: env.context.message_id, timestamp: new Date((await this.now()) * 1000).toISOString() }, message: message ?? {}, ...(error ? { error } : {}) };
          const bap = this.lookup(env.context.bap_id)!;
          await this.post(sub, `${this.internal(bap)}/on_${action}`, callback).catch(() => undefined);
        });
        return;
      }
      // BAP receiving a callback
      const slot = this.waiters.get(`${env.context.transaction_id}:${action}`);
      if (slot) {
        slot.envelopes.push(env);
        slot.resolve?.();
      }
      send(res, 200, ack);
    };

    router.rawPost("/beckn/gateway/:action", ({ req, res, params }) => handleRaw(req, res, "gateway", "gateway", params.action));
    router.rawPost("/beckn/bpp/:id/:action", ({ req, res, params }) => handleRaw(req, res, "bpp", params.id, params.action));
    router.rawPost("/beckn/bap/:id/:action", ({ req, res, params }) => handleRaw(req, res, "bap", params.id, params.action));
  }

  // ------------------------------------------------------------------ product flows (used by the UI and the AI assistant)

  async sponsorSearch(intent: { materials?: string[]; minCollectorShareBps?: number; budgetInr?: number; region?: string }) {
    const r = await this.request("sponsor-desk.vartul.sandbox", "search", DOMAINS.programme, {
      intent: { descriptor: { name: "Coastal recovery programmes" }, tags: { materials: intent.materials ?? [], min_collector_share_bps: intent.minCollectorShareBps ?? 0, budget_inr: intent.budgetInr, region: intent.region ?? "Raigad" } },
    }, { collectMs: 4000 });
    const offers = r.callbacks.flatMap((c) =>
      (c.message?.catalog?.providers ?? []).flatMap((p: any) => (p.items ?? []).map((item: any) => ({ bpp: c.context.bpp_id, provider: { id: p.id, descriptor: p.descriptor, credentials: p.credentials, trackRecord: p.tags?.track_record, registrations: p.registrations }, item }))),
    );
    return { transactionId: r.transactionId, offers, responders: r.callbacks.map((c) => c.context.bpp_id), messages: r.messages };
  }

  async sponsorStep(step: "select" | "init" | "status", input: { transactionId: string; bpp: string; item: string; fundingInr: number; sponsor?: string }) {
    const order: any = { provider: { id: this.lookup(input.bpp)?.participants[0] }, items: [{ id: input.item, quantity: { selected: { value: String(input.fundingInr) } } }] };
    if (input.sponsor) order.billing = { participant: input.sponsor, name: this.v.actors.participantName(input.sponsor) };
    const r = await this.request("sponsor-desk.vartul.sandbox", step, DOMAINS.programme, step === "status" ? { order_id: input.item, order } : { order }, { bppId: input.bpp, transactionId: input.transactionId });
    const cb = r.callbacks[0];
    if (!cb) throw new DomainError(`No on_${step} received`, 504);
    if (cb.error) throw new DomainError(cb.error.message, 409);
    return { transactionId: r.transactionId, response: cb.message, messages: r.messages };
  }

  /** Sponsor commits: propose and fund the exact quoted terms on the ledger, then confirm on the network. */
  async sponsorConfirm(input: { transactionId: string; bpp: string; item: string; fundingInr: number; sponsor: string }) {
    const spec = openOfferings.find((s) => s.id === input.item);
    if (!spec) throw new DomainError(`Unknown offering ${input.item}`, 404);
    const ledger = await this.rt.exclusive(async () => {
      if (!this.v.store.programmes[spec.id]) await this.v.proposeProgramme(spec, [{ code: input.sponsor, share: input.fundingInr }]);
      await this.v.sync();
      const proj = this.v.indexer.programmes.get(idOf(spec.id));
      if (proj && proj.fundedInr < proj.budgetInr) await this.v.fundProgramme(spec.id, input.sponsor);
      await this.v.sync();
      return { programme_id: idOf(spec.id), terms_fingerprint: this.v.store.programmes[spec.id].termsHash };
    });
    const r = await this.request("sponsor-desk.vartul.sandbox", "confirm", DOMAINS.programme, {
      order: { provider: { id: this.lookup(input.bpp)?.participants[0] }, items: [{ id: spec.id, quantity: { selected: { value: String(input.fundingInr) } } }], billing: { participant: input.sponsor }, ledger },
    }, { bppId: input.bpp, transactionId: input.transactionId, collectMs: 15000 });
    const cb = r.callbacks[0];
    if (!cb) throw new DomainError("No on_confirm received", 504);
    if (cb.error) throw new DomainError(cb.error.message, 409);
    return { transactionId: r.transactionId, response: cb.message, messages: r.messages };
  }

  async recyclerSearch(material?: string) {
    const r = await this.request("recycler-app.vartul.sandbox", "search", DOMAINS.material, { intent: { item: { descriptor: { code: material } } } }, { collectMs: 4000 });
    const lots = r.callbacks.flatMap((c) => (c.message?.catalog?.providers ?? []).flatMap((p: any) => (p.items ?? []).map((item: any) => ({ bpp: c.context.bpp_id, provider: { id: p.id, descriptor: p.descriptor }, item }))));
    return { transactionId: r.transactionId, lots, messages: r.messages };
  }

  /** Buy a lot over the network: select → init → confirm (seller offers on ledger) → buyer settles DvP. */
  async recyclerBuy(input: { lot: string; buyer: string; transactionId?: string }) {
    const lot = this.v.store.lots[input.lot];
    if (!lot) throw new DomainError(`Unknown lot ${input.lot}`, 404);
    const bpp = this.bppFor(lot.originator)!.subscriber_id;
    const order = { provider: { id: lot.originator }, items: [{ id: input.lot }], billing: { participant: input.buyer } };
    let tx = input.transactionId;
    for (const step of ["select", "init"] as const) {
      const r = await this.request("recycler-app.vartul.sandbox", step, DOMAINS.material, { order }, { bppId: bpp, transactionId: tx });
      tx = r.transactionId;
      if (r.callbacks[0]?.error) throw new DomainError(r.callbacks[0].error.message, 409);
    }
    const confirmed = await this.request("recycler-app.vartul.sandbox", "confirm", DOMAINS.material, { order }, { bppId: bpp, transactionId: tx, collectMs: 15000 });
    const cb = confirmed.callbacks[0];
    if (!cb || cb.error) throw new DomainError(cb?.error?.message ?? "No on_confirm", 409);
    const offerId = cb.message.order.ledger.offer_id as number;
    const price = Number(cb.message.order.quote.price.value);
    const sent = await this.rt.exclusive(async () => {
      const s = await this.v.buyOffer(input.lot, input.buyer, offerId, price);
      await this.v.sync();
      return s;
    });
    return { transactionId: tx!, order: cb.message.order, settlementTx: sent.hash, messages: this.transactionLog(tx!) };
  }

  async verifierSearch() {
    const r = await this.request("sponsor-desk.vartul.sandbox", "search", DOMAINS.verification, { intent: { descriptor: { name: "Accredited verification" } } }, { collectMs: 3000 });
    return { transactionId: r.transactionId, providers: r.callbacks.flatMap((c) => c.message?.catalog?.providers ?? []), messages: r.messages };
  }
}

export function becknRoutes(router: Router, rt: Runtime, baseUrl: string, internalUrl: string) {
  const net = new BecknNetwork(rt, baseUrl, internalUrl);
  net.routes(router);
  router
    .post("/api/bap/sponsor/search", ({ body }) => net.sponsorSearch(body ?? {}))
    .post("/api/bap/sponsor/select", ({ body }) => net.sponsorStep("select", body))
    .post("/api/bap/sponsor/init", ({ body }) => net.sponsorStep("init", body))
    .post("/api/bap/sponsor/confirm", ({ body }) => net.sponsorConfirm(body))
    .post("/api/bap/sponsor/status", ({ body }) => net.sponsorStep("status", body))
    .post("/api/bap/recycler/search", ({ body }) => net.recyclerSearch(body?.material))
    .post("/api/bap/recycler/buy", ({ body }) => net.recyclerBuy(body))
    .post("/api/bap/verifiers/search", () => net.verifierSearch());
  return net;
}
