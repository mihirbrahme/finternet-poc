import type { Router } from "./api/http.js";
import type { Runtime } from "./runtime.js";
import type { coreRoutes } from "./api/routes.js";

/** Optional route groups layered on the core API: Beckn sandbox (M4), scenes (M5), assistants (M7). */
export async function extensions(_router: Router, _rt: Runtime, _core: ReturnType<typeof coreRoutes>) {}
