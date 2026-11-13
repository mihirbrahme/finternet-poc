import type { Router } from "./api/http.js";
import { config, type Runtime } from "./runtime.js";
import type { coreRoutes } from "./api/routes.js";
import { becknRoutes } from "./beckn/network.js";
import { scenes, sceneById } from "./seed/scenes.js";
import { runSceneStep } from "./seed/seed.js";
import { DomainError } from "./lib/util.js";

/** Route groups layered on the core API: Beckn sandbox (M4), scenes (M5), assistants (M7). */
export async function extensions(router: Router, rt: Runtime, _core: ReturnType<typeof coreRoutes>, port = config.apiPort) {
  const beckn = becknRoutes(router, rt, rt.vartul.baseUrl, `http://127.0.0.1:${port}`);

  const describe = (id: string) => {
    const s = sceneById(id);
    if (!s) throw new DomainError(`Unknown scene ${id}`, 404, "UNKNOWN_SCENE");
    const ctx = { rt, beckn, state: rt.vartul.store.sceneState[s.id] ?? {} };
    const done = rt.vartul.store.scene === s.id ? (rt.vartul.store.sceneProgress[s.id] ?? 0) : 0;
    return {
      id: s.id,
      number: s.number,
      title: s.title,
      question: s.question,
      narrative: s.narrative,
      points: s.points,
      surface: s.surface(ctx),
      active: rt.current === s.id || rt.vartul.store.scene === s.id,
      steps: s.steps.map((st, i) => ({ id: st.id, label: st.label, actor: st.actor, detail: st.detail, done: i < done, next: i === done })),
    };
  };

  router
    .get("/api/scenes", () => ({ current: rt.vartul.store.scene ?? rt.current, scenes: scenes.map((s) => describe(s.id)) }))
    .get("/api/scenes/:id", ({ params }) => describe(params.id))
    .post("/api/scenes/:id/reset", async ({ params }) => {
      if (!sceneById(params.id)) throw new DomainError(`Unknown scene ${params.id}`, 404, "UNKNOWN_SCENE");
      await rt.exclusive(() => rt.loadSnapshot(params.id));
      return describe(params.id);
    })
    .post("/api/scenes/:id/steps/:step", async ({ params }) => {
      const scene = sceneById(params.id);
      if (!scene) throw new DomainError(`Unknown scene ${params.id}`, 404, "UNKNOWN_SCENE");
      if (rt.vartul.store.scene !== scene.id) throw new DomainError(`Reset to ${scene.id} before running its steps`, 409, "SCENE_NOT_LOADED");
      const result = await runSceneStep(rt, beckn, scene, params.step);
      return { result, scene: describe(scene.id) };
    });

  return { beckn };
}
