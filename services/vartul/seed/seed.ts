/**
 * Deterministic seeder (milestone 5). Builds the six-month history, then plays every
 * demonstration scene live and saves a snapshot at the start of each one, so the presenter can
 * jump to any scene and re-run its steps against an exact, reproducible ledger.
 */
import { createServer, type Server } from "node:http";
import { Router } from "../api/http.js";
import { Runtime, config } from "../runtime.js";
import { becknRoutes, type BecknNetwork } from "../beckn/network.js";
import { calendar } from "../dataset/murud.js";
import { DomainError, toUnix } from "../lib/util.js";
import { seedHistory } from "./history.js";
import { scenes, type Scene, type SceneContext, type StepResult } from "./scenes.js";

/** Run one step of a scene, recording progress and carried state in the off-ledger store. */
export async function runSceneStep(rt: Runtime, beckn: BecknNetwork, scene: Scene, stepId: string): Promise<StepResult> {
  const store = rt.vartul.store;
  const index = scene.steps.findIndex((s) => s.id === stepId);
  if (index < 0) throw new DomainError(`Unknown step ${stepId} in ${scene.id}`, 404, "UNKNOWN_STEP");
  const done = store.sceneProgress[scene.id] ?? 0;
  if (index < done) throw new DomainError(`Step "${scene.steps[index].label}" already ran; reset the scene to replay it`, 409, "STEP_DONE");
  if (index > done) throw new DomainError(`Run "${scene.steps[done].label}" first`, 409, "STEP_ORDER");
  store.sceneState[scene.id] ??= {};
  const ctx: SceneContext = { rt, beckn, state: store.sceneState[scene.id] };
  rt.vartul.scene = scene.id;
  store.scene = scene.id;
  const result = await scene.steps[index].run(ctx);
  store.sceneProgress[scene.id] = index + 1;
  await rt.vartul.sync();
  return result;
}

/** A local HTTP endpoint so Beckn providers and the gateway can deliver signed callbacks. */
async function becknHost(rt: Runtime, port: number) {
  const router = new Router();
  const beckn = becknRoutes(router, rt, rt.vartul.baseUrl, `http://127.0.0.1:${port}`);
  const server: Server = createServer(async (req, res) => {
    if (!(await router.handle(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
  return { beckn, close: () => new Promise<void>((r) => server.close(() => r())) };
}

export async function seedAll(opts: { chainPort?: number; hostPort?: number; log?: (m: string) => void } = {}) {
  const log = opts.log ?? ((m: string) => console.log(m));
  const started = Date.now();
  const rt = new Runtime(opts.chainPort ?? config.chainPort);
  await rt.start(toUnix(calendar.genesis));
  const host = await becknHost(rt, opts.hostPort ?? config.apiPort + 77);
  try {
    rt.chain.fast = true;
    await seedHistory(rt.vartul, log);
    rt.chain.fast = false;
    await rt.chain.setTime(toUnix(calendar.demoDate));
    await rt.vartul.sync();
    log(`History seeded in ${((Date.now() - started) / 1000).toFixed(1)} s`);

    const summary: Record<string, unknown>[] = [];
    for (const scene of scenes) {
      rt.vartul.store.scene = scene.id;
      rt.vartul.scene = scene.id;
      rt.vartul.store.sceneProgress = {};
      rt.vartul.store.sceneState = {};
      await rt.saveSnapshot(scene.id, await rt.chain.latestTimestamp());
      for (const step of scene.steps) {
        try {
          const r = await runSceneStep(rt, host.beckn, scene, step.id);
          log(`  ${scene.id} · ${step.id}: ${r.summary}`);
        } catch (e) {
          throw new Error(`${scene.id} step "${step.id}" failed: ${(e as Error).message}`, { cause: e });
        }
      }
      summary.push({ scene: scene.id, steps: scene.steps.length });
      // A short pause in sandbox time between scenes keeps their transactions distinct.
      await rt.chain.increaseTime(600);
    }
    const totals = rt.vartul.indexer.totals();
    rt.markSnapshotsFresh({ scenes: summary, totals });
    log(`Seeded ${scenes.length} scene snapshots in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    return totals;
  } finally {
    await host.close();
    await rt.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("seed/seed.ts")) {
  seedAll().then(
    (t) => {
      console.log(JSON.stringify(t, null, 2));
      process.exit(0);
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
