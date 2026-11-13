/**
 * M5 acceptance: seeded snapshots and the scene runner. Loads the seeded history, checks the
 * network invariants, replays scene 3 (hero lot) and scene 7 (exception) over HTTP, enforces step
 * order, and confirms a reset restores the exact starting state.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Router } from "../../services/vartul/api/http.js";
import { coreRoutes } from "../../services/vartul/api/routes.js";
import { extensions } from "../../services/vartul/extensions.js";
import { Runtime, ensureContractsBuilt } from "../../services/vartul/runtime.js";

ensureContractsBuilt();
const PORT = 4393;
const rt = new Runtime(18613, `http://127.0.0.1:${PORT}`);
if (!rt.snapshotsFresh()) {
  const { seedAll } = await import("../../services/vartul/seed/seed.js");
  await seedAll({ chainPort: 18614, hostPort: 4394, log: () => undefined });
}
await rt.start();
await rt.loadSnapshot("scene-01");
const router = new Router();
const core = coreRoutes(router, rt);
await extensions(router, rt, core, PORT);
const server = createServer(async (req, res) => { if (!(await router.handle(req, res))) { res.writeHead(404); res.end(); } });
await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", r));
const base = `http://127.0.0.1:${PORT}`;
const call = async (method: string, p: string, body?: unknown) => {
  const r = await fetch(base + p, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};
const ok = async (method: string, p: string, body?: unknown) => {
  const r = await call(method, p, body);
  if (r.status >= 400) throw new Error(`${p}: ${r.body.error}`);
  return r.body;
};

try {
  // Seeded history invariants
  const overview = await ok("GET", "/api/overview");
  assert.equal(overview.totals.overClaimedLots, 0, "no lot is claimed beyond its verified quantity");
  assert.ok(overview.totals.lots > 300, "six months of lots");
  assert.ok(overview.totals.lastMileShare > 0.3, "more than 30% of released funds reached collectors");
  const list = await ok("GET", "/api/scenes");
  assert.equal(list.scenes.length, 11);

  // Step order is enforced and scenes must be loaded first
  assert.equal((await call("POST", "/api/scenes/scene-03/steps/capture")).status, 409);
  await ok("POST", "/api/scenes/scene-03/reset");
  assert.equal((await call("POST", "/api/scenes/scene-03/steps/mint")).status, 409);

  // Scene 3: follow one bag
  const results: Record<string, string> = {};
  for (const step of ["capture", "mint", "dispatch", "receipt", "verify", "window", "settle"]) {
    results[step] = (await ok("POST", `/api/scenes/scene-03/steps/${step}`)).result.summary;
  }
  assert.match(results.settle, /₹21,240 released; 11 collectors paid ₹8,496/);
  const lot = await ok("GET", "/api/lots/VRL-MRD-2026-0042");
  assert.equal(lot.state ?? lot.lot?.state, "SETTLED");
  const sunanda = await ok("GET", "/api/saathis/SS-MRD-0017");
  assert.ok(sunanda.payouts.some((p: any) => p.lot === "VRL-MRD-2026-0042" && p.amountInr > 480 && p.amountInr < 500), "Sunanda is paid about ₹492 for the hero lot");
  assert.equal((await call("POST", "/api/scenes/scene-03/steps/settle")).status, 409, "a step cannot run twice");

  // Reset restores the exact start of the scene
  await ok("POST", "/api/scenes/scene-03/reset");
  assert.equal((await call("GET", "/api/lots/VRL-MRD-2026-0042")).status, 404);

  // Scene 7: exception settlement
  await ok("POST", "/api/scenes/scene-07/reset");
  for (const step of ["propose", "neelkanth"]) await ok("POST", `/api/scenes/scene-07/steps/${step}`);
  const mid = await ok("GET", "/api/programmes/PRG-MRD-BEACH-2026");
  assert.equal(mid.paidInr ?? mid.programme?.paidInr, 0, "nothing moves before the final approval");
  const done = await ok("POST", "/api/scenes/scene-07/steps/coastline");
  assert.match(done.result.summary, /Paid ₹1,85,700; refunded ₹14,300/);
  console.log("scenes: all assertions passed");
} finally {
  server.close();
  await rt.stop();
}
process.exit(0);
