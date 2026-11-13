import type { Router } from "./api/http.js";
import { config, type Runtime } from "./runtime.js";
import type { coreRoutes } from "./api/routes.js";
import { becknRoutes } from "./beckn/network.js";

/** Route groups layered on the core API: Beckn sandbox (M4), scenes (M5), assistants (M7). */
export async function extensions(router: Router, rt: Runtime, _core: ReturnType<typeof coreRoutes>, port = config.apiPort) {
  const beckn = becknRoutes(router, rt, rt.vartul.baseUrl, `http://127.0.0.1:${port}`);
  return { beckn };
}
