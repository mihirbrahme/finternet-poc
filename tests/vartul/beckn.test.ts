/**
 * M4 acceptance: Beckn-aligned sandbox. Signed discovery across three NGO BPPs through the gateway,
 * sponsor select → init → confirm linked to a ledger commitment, recycler purchase with DvP,
 * verifier discovery, and rejection of tampered or unsigned messages.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Router } from "../../services/vartul/api/http.js";
import { coreRoutes } from "../../services/vartul/api/routes.js";
import { extensions } from "../../services/vartul/extensions.js";
import { Runtime, ensureContractsBuilt } from "../../services/vartul/runtime.js";
import { programmes } from "../../services/vartul/dataset/murud.js";
import { toUnix } from "../../services/vartul/lib/util.js";
import { authorizationHeader, subscriberKey } from "../../services/vartul/beckn/signing.js";

ensureContractsBuilt();
const PORT = 4392;
const rt = new Runtime(18612, `http://127.0.0.1:${PORT}`);
await rt.start(toUnix("2026-05-01T04:30:00Z"));
const router = new Router();
const core = coreRoutes(router, rt);
await extensions(router, rt, core, PORT);
const server = createServer(async (req, res) => { if (!(await router.handle(req, res))) { res.writeHead(404); res.end(); } });
await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", r));
const base = `http://127.0.0.1:${PORT}`;
const post = async (p: string, body: unknown) => {
  const r = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${p}: ${j.error}`);
  return j;
};

try {
  const v = rt.vartul;
  await v.bootstrapNetwork();
  const spec = programmes[0];
  await v.proposeProgramme(spec, spec.sponsors);
  await v.fundProgramme(spec.id, "TIDEWELL");
  await v.acceptProgramme(spec.id);
  await rt.chain.increaseTime(3600);
  const ids: string[] = [];
  for (let i = 0; i < 6; i++) ids.push((await v.captureRecord({ saathi: "SS-MRD-0004", material: "HDPE", grams: 9000 })).id);
  await rt.chain.increaseTime(3600);
  const { code } = await v.mintLot({ programme: spec.id, material: "HDPE", recordIds: ids, contaminationGrams: 1000, aggregatedGrams: 53_000 });
  await v.dispatch(code);
  await v.confirmReceipt(code, 52_800);
  await v.verifyLot(code, { eligibleGrams: 52_000 });
  await rt.chain.increaseTime(73 * 3600);
  await v.finalizeLot(code);
  await v.sync();

  // 1. Discovery through the gateway reaches all three NGO providers.
  const search = await post("/api/bap/sponsor/search", { materials: ["NETS", "PET", "MLP"], minCollectorShareBps: 2500 });
  assert.deepEqual(new Set(search.responders), new Set(["aamhi.bpp.vartul.sandbox", "sagar.bpp.vartul.sandbox", "hirwai.bpp.vartul.sandbox"]));
  const nets = search.offers.find((o: any) => o.item.id === "PRG-MRD-NETS-2027");
  assert.ok(nets, "Aamhi's nets offering discovered");
  assert.equal(nets.provider.trackRecord.source, "ledger");
  assert.equal(nets.provider.trackRecord.verifiedKg, 52);
  assert.ok(search.messages.every((m: any) => m.signatureValid), "every message signature verified");

  // 2. Select → init → confirm, with the commitment on the ledger.
  const tx = search.transactionId;
  const quote = await post("/api/bap/sponsor/select", { transactionId: tx, bpp: nets.bpp, item: nets.item.id, fundingInr: 300_000 });
  assert.equal(quote.response.order.quote.breakup[0].price.value, "120000");
  const init = await post("/api/bap/sponsor/init", { transactionId: tx, bpp: nets.bpp, item: nets.item.id, fundingInr: 300_000, sponsor: "COASTLINE" });
  const fp = init.response.order.terms.fingerprint;
  const confirm = await post("/api/bap/sponsor/confirm", { transactionId: tx, bpp: nets.bpp, item: nets.item.id, fundingInr: 300_000, sponsor: "COASTLINE" });
  assert.equal(confirm.response.order.state, "ACTIVE");
  assert.equal(confirm.response.order.ledger.terms_fingerprint, fp, "ledger terms equal the terms quoted in on_init");
  const prog = v.indexer.programmes.get(confirm.response.order.ledger.programme_id)!;
  assert.equal(prog.status, "ACTIVE");
  assert.equal(prog.fundedInr, 300_000);
  assert.ok(v.store.programmes["PRG-MRD-NETS-2027"].becknOrderId?.startsWith("ORD-"));
  const again = await post("/api/bap/sponsor/search", { materials: ["NETS"] });
  assert.ok(!again.offers.some((o: any) => o.item.id === "PRG-MRD-NETS-2027"), "funded offering leaves the open catalogue");

  // 3. Recycler discovers verified material and buys it with delivery versus payment.
  const lots = await post("/api/bap/recycler/search", { material: "HDPE" });
  assert.ok(lots.lots.some((l: any) => l.item.id === code));
  const bought = await post("/api/bap/recycler/buy", { lot: code, buyer: "GHATMATHA" });
  assert.ok(bought.settlementTx.startsWith("0x"));
  await v.sync();
  assert.ok(v.store.lots[code].sale?.buyer === "GHATMATHA");

  // 4. Verifier discovery.
  const verifiers = await post("/api/bap/verifiers/search", {});
  assert.deepEqual(verifiers.providers.map((p: any) => p.id).sort(), ["DRISHTI", "NIRIKSHAN"]);

  // 5. Tampered and unsigned messages are rejected.
  const env = { context: { domain: "circular:recovery-programme", action: "search", version: "1.1.0", bap_id: "sponsor-desk.vartul.sandbox", bap_uri: `${base}/beckn/bap/sponsor-desk.vartul.sandbox`, transaction_id: "t-tamper", message_id: "m-1", timestamp: new Date().toISOString(), ttl: "PT30S" }, message: { intent: {} } };
  const body = JSON.stringify(env);
  const { header } = authorizationHeader("sponsor-desk.vartul.sandbox", "k1", subscriberKey("sponsor-desk.vartul.sandbox"), body, await rt.chain.latestTimestamp());
  const tampered = await fetch(`${base}/beckn/bpp/aamhi.bpp.vartul.sandbox/search`, { method: "POST", headers: { authorization: header }, body: body.replace("{}", '{"x":1}') });
  assert.equal(tampered.status, 401);
  const unsigned = await fetch(`${base}/beckn/bpp/aamhi.bpp.vartul.sandbox/search`, { method: "POST", body });
  assert.equal(unsigned.status, 401);
  const impostor = authorizationHeader("recycler-app.vartul.sandbox", "k1", subscriberKey("recycler-app.vartul.sandbox"), body, await rt.chain.latestTimestamp());
  const wrongSigner = await fetch(`${base}/beckn/bpp/aamhi.bpp.vartul.sandbox/search`, { method: "POST", headers: { authorization: impostor.header }, body });
  assert.equal(wrongSigner.status, 401, "signer must be the subscriber named in the context");
  const log = await fetch(`${base}/api/beckn/log`).then((r) => r.json());
  assert.ok(log.some((m: any) => !m.signatureValid), "rejected messages are logged as invalid");
  console.log(`Beckn acceptance passed: ${v.store.beckn.length} signed messages, programme order ${v.store.programmes["PRG-MRD-NETS-2027"].becknOrderId}, ${code} bought by Ghatmatha`);
} finally {
  server.close();
  await rt.stop();
}
