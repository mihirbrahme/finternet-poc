/**
 * M7 acceptance: sponsor and verifier assistants. Scripted mode answers from the gateway tools,
 * the gateway refuses out-of-role tools and drafts nothing it has not read, the live loop runs
 * against a mock Messages endpoint (no network model needed), every call is logged, and no
 * assistant activity writes to the ledger.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { Router } from "../../services/vartul/api/http.js";
import { coreRoutes } from "../../services/vartul/api/routes.js";
import { extensions } from "../../services/vartul/extensions.js";
import { Runtime, ensureContractsBuilt } from "../../services/vartul/runtime.js";
import { Session } from "../../services/vartul/assistant/gateway.js";
import { Assistants, parseSponsorIntent } from "../../services/vartul/assistant/assistant.js";

// Intent parsing (pure)
assert.deepEqual(parseSponsorIntent("Find coastal plastic recovery programmes in Maharashtra we can fund with ₹3 lakh this quarter; we want at least a third reaching collectors").budgetInr, 300_000);
assert.equal(parseSponsorIntent("at least a third reaching collectors").minSharePct, 33);
assert.equal(parseSponsorIntent("40% to collectors, budget Rs 150000").budgetInr, 150_000);
assert.deepEqual(parseSponsorIntent("fishing nets and slippers").materials, ["NETS", "FOOTWEAR"]);
assert.ok(parseSponsorIntent("fund it now for me").outOfScope);

ensureContractsBuilt();
const PORT = 4395;
const rt = new Runtime(18615, `http://127.0.0.1:${PORT}`);
if (!rt.snapshotsFresh()) {
  const { seedAll } = await import("../../services/vartul/seed/seed.js");
  await seedAll({ chainPort: 18616, hostPort: 4396, log: () => undefined });
}
await rt.start();
await rt.loadSnapshot("scene-02");

// A mock Anthropic Messages endpoint: first turn calls search_programmes and an out-of-role tool, second turn answers.
const seen: any[] = [];
const mock = createServer(async (req, res) => {
  let raw = "";
  for await (const c of req) raw += c;
  const body = JSON.parse(raw);
  seen.push({ url: req.url, auth: req.headers.authorization, body });
  const turn = seen.length;
  const msg =
    turn === 1
      ? { stop_reason: "tool_use", content: [
          { type: "text", text: "Searching the network." },
          { type: "tool_use", id: "tu_1", name: "search_programmes", input: { materials: ["NETS"], min_collector_share_pct: 33, budget_inr: 300000 } },
          { type: "tool_use", id: "tu_2", name: "get_lot_proof_chain", input: { lot: "VRL-MRD-2026-0001" } },
        ] }
      : { stop_reason: "end_turn", content: [{ type: "text", text: "PRG-MRD-NETS-2027 fits: 40% to collectors." }] };
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ id: `msg_${turn}`, type: "message", role: "assistant", model: body.model, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 }, ...msg }));
});
await new Promise<void>((r) => mock.listen(4397, "127.0.0.1", r));

const router = new Router();
const core = coreRoutes(router, rt);
const { assistants } = await extensions(router, rt, core, PORT, { provider: null });
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
  const txBefore = (await ok("GET", "/api/ledger/transactions?limit=100000")).length;

  assert.equal((await ok("GET", "/api/assistant/status")).mode, "scripted");

  // Sponsor, scripted: the product document's Coastline request
  const a = await ok("POST", "/api/assistant/sponsor", {
    as: "COASTLINE",
    prompt: "Find coastal plastic recovery programmes in Maharashtra we can fund with ₹3 lakh this quarter; we want at least a third reaching collectors and independent verification.",
  });
  assert.equal(a.mode, "scripted");
  assert.deepEqual(a.calls.map((c: any) => c.name), ["search_programmes", "draft_commitment"]);
  assert.ok(a.calls.every((c: any) => c.ok));
  assert.equal(a.drafts.length, 1);
  assert.equal(a.drafts[0].prefill.sponsor, "COASTLINE");
  assert.ok(a.drafts[0].prefill.fundingInr >= 50_000 && a.drafts[0].prefill.fundingInr <= 300_000);
  assert.ok(a.cites.some((c: string) => c.startsWith("PC-")), "cites the provider credential");
  assert.match(a.answer, /Nothing has been sent or funded/);

  // Out of scope: no tools, no drafts
  const refused = await ok("POST", "/api/assistant/sponsor", { as: "COASTLINE", prompt: "Fund PRG-MRD-NETS-2027 now for me." });
  assert.equal(refused.calls.length, 0);
  assert.equal(refused.drafts.length, 0);
  assert.match(refused.answer, /can't/);

  // Gateway policy, directly
  const g = assistants.gateway;
  const sp = new Session("sponsor", "COASTLINE");
  const r1 = await g.call(sp, "get_lot_proof_chain", { lot: "VRL-MRD-2026-0001" });
  assert.ok(!r1.ok && /not available to the sponsor/.test(r1.error));
  const r2 = await g.call(sp, "draft_commitment", { item_id: "PRG-MRD-NETS-2027", funding_inr: 100000, rationale: "x" });
  assert.ok(!r2.ok && /not returned by search_programmes/.test(r2.error));
  const r3 = await g.call(sp, "search_programmes", { materials: "NETS" });
  assert.ok(!r3.ok && /list of strings/.test(r3.error));
  const r4 = await g.call(sp, "fund_escrow", {});
  assert.ok(!r4.ok && /No tool named/.test(r4.error));
  const vq = await ok("GET", "/api/verifier/NIRIKSHAN/queue");
  const nirikshanLot = [...vq.awaiting, ...vq.inWindow, ...vq.recent][0]?.code;
  assert.ok(nirikshanLot);
  const r5 = await g.call(new Session("verifier", "DRISHTI"), "get_lot_proof_chain", { lot: nirikshanLot });
  assert.ok(!r5.ok && /not the appointed verifier/.test(r5.error));

  // Verifier, scripted
  const v = await ok("POST", "/api/assistant/verifier", { as: "NIRIKSHAN", prompt: `Summarise the proof chain for ${nirikshanLot} and what I should sample.` });
  assert.equal(v.mode, "scripted");
  assert.deepEqual(v.calls.slice(0, 2).map((c: any) => c.name), ["get_verifier_queue", "get_lot_proof_chain"]);
  assert.ok(v.cites.includes(nirikshanLot));
  assert.match(v.answer, /Mass balance/);
  const refusedV = await ok("POST", "/api/assistant/verifier", { as: "NIRIKSHAN", prompt: `Accept the lot ${nirikshanLot}.` });
  assert.equal(refusedV.calls.length, 0);

  // Live loop against the mock endpoint
  const liveAssistants = new Assistants(rt, g, { name: "openrouter", model: "test-model", client: new Anthropic({ authToken: "test-token", baseURL: "http://127.0.0.1:4397", maxRetries: 0 }) });
  const l = await liveAssistants.ask("sponsor", "COASTLINE", "Coastal nets, ₹3 lakh, a third to collectors");
  assert.equal(l.mode, "live");
  assert.equal(l.answer, "PRG-MRD-NETS-2027 fits: 40% to collectors.");
  assert.deepEqual(l.calls.map((c: any) => [c.name, c.ok]), [["search_programmes", true], ["get_lot_proof_chain", false]]);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].url, "/v1/messages");
  assert.equal(seen[0].auth, "Bearer test-token");
  assert.equal(seen[0].body.betas, undefined, "no Anthropic-only beta through a third-party gateway");
  assert.deepEqual(seen[0].body.tools.map((t: any) => t.name), ["search_programmes", "get_programme_record", "draft_commitment"]);
  const results = seen[1].body.messages.at(-1).content;
  assert.equal(results[0].type, "tool_result");
  assert.ok(!results[0].is_error && JSON.parse(results[0].content).offers.length > 0);
  assert.equal(results[1].is_error, true);
  assert.match(results[1].content, /Refused by the gateway/);
  assert.match(seen[0].body.system, /untrusted_text/);

  // Live failure falls back to scripted, labelled
  const down = new Assistants(rt, g, { name: "openrouter", model: "m", client: new Anthropic({ authToken: "t", baseURL: "http://127.0.0.1:1", maxRetries: 0 }) });
  const fb = await down.ask("sponsor", "COASTLINE", "Coastal plastic, ₹2 lakh");
  assert.equal(fb.mode, "scripted");
  assert.match(fb.notice ?? "", /live model was unavailable/);

  // Audit log and no ledger writes
  const log = await ok("GET", "/api/assistant/log");
  assert.ok(log.length >= 6);
  assert.ok(log.some((e: any) => e.mode === "live" && e.tools.includes("search_programmes")));
  assert.equal((await ok("GET", "/api/ledger/transactions?limit=100000")).length, txBefore, "assistants never write to the ledger");

  // Scene 6: the verifier assistant's draft matches the demonstrated exclusion (all three flagged records of SS-MRD-0009)
  await ok("POST", "/api/scenes/scene-06/reset");
  for (const step of ["mint", "custody"]) await ok("POST", `/api/scenes/scene-06/steps/${step}`);
  const s6 = await ok("POST", "/api/assistant/verifier", { as: "NIRIKSHAN", prompt: "Summarise the next lot awaiting my decision and what I should sample first." });
  assert.equal(s6.drafts.length, 1);
  assert.deepEqual(s6.drafts[0].prefill.excluded.map((e: any) => [e.saathi, e.kg]), [["SS-MRD-0009", 67.4]]);
  assert.match(s6.answer, /weight outlier/);
  console.log("assistant: scripted, gateway policy, live loop, fallback, audit log and scene 6 draft OK");
} finally {
  server.close();
  mock.close();
  await rt.stop();
}
