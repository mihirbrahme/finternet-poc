import { createServer, type Server } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, normalize } from "node:path";
import { Router, send } from "./api/http.js";
import { coreRoutes } from "./api/routes.js";
import { Runtime, config, root, ensureContractsBuilt } from "./runtime.js";
import { extensions } from "./extensions.js";

const webDist = resolve(root, "apps/vartul-web/dist");
const types: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".json": "application/json", ".woff2": "font/woff2", ".ico": "image/x-icon", ".webp": "image/webp",
};

function serveStatic(pathname: string, res: import("node:http").ServerResponse) {
  if (!existsSync(webDist)) {
    send(res, 200, "<p>Web app not built. Run <code>pnpm web:build</code> or <code>pnpm web:dev</code>.</p>", "text/html");
    return;
  }
  const target = normalize(resolve(webDist, `.${pathname}`));
  const file = target.startsWith(webDist) && existsSync(target) && statSync(target).isFile() ? target : resolve(webDist, "index.html");
  res.writeHead(200, {
    "content-type": `${types[extname(file)] ?? "application/octet-stream"}; charset=utf-8`,
    "cache-control": file.endsWith("index.html") ? "no-store" : "public, max-age=3600",
  });
  res.end(readFileSync(file));
}

export async function startServer(opts: { port?: number; chainPort?: number; snapshot?: string } = {}) {
  ensureContractsBuilt();
  const rt = new Runtime(opts.chainPort ?? config.chainPort);
  if (!rt.snapshotsFresh()) {
    console.log("Demonstration snapshots missing or stale; seeding the six-month history (about a minute)…");
    const { seedAll } = await import("./seed/seed.js");
    await seedAll({ chainPort: opts.chainPort ?? config.chainPort });
  }
  await rt.start();
  await rt.loadSnapshot(opts.snapshot ?? "scene-01");

  const router = new Router();
  const core = coreRoutes(router, rt);
  await extensions(router, rt, core, opts.port ?? config.apiPort);

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (await router.handle(req, res)) return;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/beckn/")) return send(res, 404, { error: "Not found" });
    serveStatic(url.pathname, res);
  });
  const port = opts.port ?? config.apiPort;
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
  console.log(`Vartul by Suma — http://127.0.0.1:${port}  (chain :${rt.chain.port}, snapshot ${rt.current})`);
  const shutdown = async () => {
    server.close();
    await rt.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  return { server, rt };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1:")}` || process.argv[1]?.endsWith("server.ts")) {
  startServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
