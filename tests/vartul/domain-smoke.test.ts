import assert from "node:assert/strict";
import { Chain, buildContracts } from "../../services/vartul/chain/chain.js";
import { Vartul } from "../../services/vartul/domain/vartul.js";
import { programmes } from "../../services/vartul/dataset/murud.js";
import { toUnix } from "../../services/vartul/lib/util.js";

buildContracts();
const chain = new Chain(18601);
await chain.start(toUnix("2026-05-01T04:30:00Z"));
try {
  const v = new Vartul(chain, "http://127.0.0.1:4300");
  const t0 = Date.now();
  await v.bootstrapNetwork();
  console.log("bootstrap", Date.now() - t0, "ms, txs", Object.keys(v.store.txs).length);
  const spec = programmes[0];
  await v.proposeProgramme(spec, spec.sponsors);
  await v.fundProgramme(spec.id, "TIDEWELL");
  await v.acceptProgramme(spec.id);
  await chain.increaseTime(3600);
  const ids: string[] = [];
  for (let i = 0; i < 30; i++) ids.push((await v.captureRecord({ saathi: `SS-MRD-${String((i % 5) + 1).padStart(4, "0")}`, material: "LDPE", grams: 8000 + i * 100 })).id);
  await chain.increaseTime(3600);
  const input = ids.reduce((s, id) => s + v.store.records[id].grams, 0);
  const { code } = await v.mintLot({ programme: spec.id, material: "LDPE", recordIds: ids, contaminationGrams: 10_000, aggregatedGrams: input - 10_000 });
  await v.dispatch(code);
  await v.confirmReceipt(code, input - 12_000);
  await v.verifyLot(code, { eligibleGrams: input - 15_000 });
  await chain.increaseTime(73 * 3600);
  const t1 = Date.now();
  await v.finalizeLot(code);
  console.log("finalize", Date.now() - t1, "ms");
  await v.sync();
  const lot = [...v.indexer.lots.values()][0];
  assert.equal(lot.state, "SETTLED");
  const totals = v.indexer.totals();
  console.log(totals);
  assert.ok(v.store.payouts.length === 5, "five collectors paid");
  const cert = Object.values(v.store.credentials).find((c) => c.type === "FundedRecoveryCertificate")!;
  const check = await v.credentials.verify(cert.jwt);
  assert.ok(check.signatureOk && !check.revoked);
  console.log("domain smoke passed");
} finally {
  await chain.stop();
}
