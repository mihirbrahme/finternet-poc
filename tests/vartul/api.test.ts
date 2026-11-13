/**
 * M2/M3 acceptance: drives the HTTP API end to end on a fresh chain — field capture, MRC minting,
 * custody, verification with an exclusion, challenge window, settlement, sale, revocation cascade
 * and public certificate verification.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Router } from "../../services/vartul/api/http.js";
import { coreRoutes } from "../../services/vartul/api/routes.js";
import { Runtime, ensureContractsBuilt } from "../../services/vartul/runtime.js";
import { programmes } from "../../services/vartul/dataset/murud.js";
import { toUnix } from "../../services/vartul/lib/util.js";

ensureContractsBuilt();
const rt = new Runtime(18611, "http://127.0.0.1:4391");
await rt.start(toUnix("2026-05-01T04:30:00Z"));
const router = new Router();
coreRoutes(router, rt);
const server = createServer(async (req, res) => {
  if (!(await router.handle(req, res))) { res.writeHead(404); res.end(); }
});
await new Promise<void>((r) => server.listen(4391, "127.0.0.1", r));
const base = "http://127.0.0.1:4391";
const get = async (p: string) => { const r = await fetch(base + p); const j = await r.json(); if (!r.ok) throw new Error(`${p}: ${j.error}`); return j; };
const post = async (p: string, body: unknown, expectFail = false) => {
  const r = await fetch(base + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (expectFail) { assert.ok(!r.ok, `${p} should fail`); return j; }
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
  await v.sync();
  await rt.chain.increaseTime(3600);

  // Field capture through the API: real device signatures.
  const ids: string[] = [];
  for (let i = 0; i < 12; i++) ids.push((await post("/api/field/capture", { saathi: `SS-MRD-00${10 + (i % 4)}`, material: "PET", kg: 9 + i / 10 })).id);
  const rec = await get(`/api/records/${ids[0]}`);
  assert.equal(rec.deviceSigned, true);
  await post("/api/field/capture", { saathi: "SS-MRD-0010", material: "PET", kg: 500 }, true);

  await rt.chain.increaseTime(3600);
  const input = ids.reduce((s, id) => s + rt.vartul.store.records[id].grams, 0) / 1000;
  const over = await post("/api/mrc/mint", { programme: spec.id, material: "PET", records: ids, contaminationKg: 2, aggregatedKg: input }, true);
  assert.match(over.error, /MassBalance/, "mass balance enforced through API");
  const minted = await post("/api/mrc/mint", { programme: spec.id, material: "PET", records: ids, contaminationKg: 2, aggregatedKg: input - 2 });
  const code = minted.code;
  await post(`/api/lots/${code}/dispatch`, {});
  await post(`/api/lots/${code}/receipt`, { kg: input - 2.5 });
  await post(`/api/lots/${code}/verify`, { eligibleKg: input - 4, excluded: [{ saathi: "SS-MRD-0013", kg: 1.5, reason: "Non-eligible material in sample" }] });
  let lot = await get(`/api/lots/${code}`);
  assert.equal(lot.state, "VERIFIED");
  assert.equal(lot.proofRootMatches, true);
  const proof = await get(`/api/lots/${code}/proof/${ids[3]}`);
  assert.equal(proof.verified, true, "Merkle inclusion of a record in the on-ledger proof root");
  await post(`/api/lots/${code}/finalize`, {}, true);
  await post("/api/sandbox/advance", { hours: 73 });
  await post(`/api/lots/${code}/finalize`, {});
  lot = await get(`/api/lots/${code}`);
  assert.equal(lot.state, "SETTLED");
  assert.equal(lot.payouts.length, 4);
  const excluded = lot.collectors.find((c: any) => c.saathi === "SS-MRD-0013");
  assert.equal(excluded.excludedKg, 1.5);

  // Sale with delivery versus payment and the EPR-ready supply claim.
  await post(`/api/lots/${code}/sell`, { buyer: "TALVAN" });
  lot = await get(`/api/lots/${code}`);
  assert.deepEqual(Object.keys(lot.projection.holders), ["TALVAN"]);
  assert.equal(lot.claims.length, 2);
  assert.equal(code, "VRL-MRD-2026-0001", "rejected mint did not consume a lot number");

  // Public verification.
  const fundedClaim = lot.claims.find((c: any) => c.type === "FUNDED_RECOVERY");
  let check = await get(`/api/verify/${fundedClaim.certificate}`);
  assert.equal(check.verdict, "VALID", JSON.stringify(check.checks));
  assert.ok(check.checks.some((c: any) => c.check === "Disclosures"));
  const qr = await fetch(`${base}/api/credentials/${fundedClaim.certificate}/qr`).then((r) => r.text());
  assert.ok(qr.startsWith("<svg"));

  // Revocation cascade: receipt revoked → lot under review → certificate contested.
  const receiptAtt = lot.attestations.find((a: any) => a.stage === "receipt").id;
  const rev = await post(`/api/attestations/${receiptAtt}/revoke`, { reason: "Weighbridge slip fabricated" });
  assert.deepEqual(rev.affected, [code]);
  check = await get(`/api/verify/${fundedClaim.certificate}`);
  assert.equal(check.verdict, "CONTESTED");
  await post(`/api/lots/${code}/review`, { void: true, outcome: "Receipt could not be substantiated" });
  check = await get(`/api/verify/${fundedClaim.certificate}`);
  assert.equal(check.verdict, "INVALID");
  assert.ok(check.checks.some((c: any) => c.check === "Revocation status" && !c.ok), "certificate revoked in status list");

  const overview = await get("/api/overview");
  assert.equal(overview.totals.overClaimedLots, 0);
  const managers = await get("/api/ledger/managers");
  assert.equal(managers.managers.length, 8);
  const did = await get("/issuers/vartul-net/did.json");
  assert.equal(did.verificationMethod[0].publicKeyJwk.crv, "Ed25519");
  const wallet = await get("/api/saathis/SS-MRD-0010");
  assert.ok(wallet.totals.paidInr > 0);
  console.log("API acceptance passed:", code, "settled, sold, revoked; certificate verdicts VALID → CONTESTED → INVALID");
} finally {
  server.close();
  await rt.stop();
}
