import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFileSync } from "node:fs";
import {
  offering,
  discoverProgrammes,
} from "../../beckn/sponsorship-sandbox/catalogue.js";
import { SponsorshipRuntime, roles, type Role } from "./runtime.js";

const apiPort = Number(process.env.DEMO_PORT ?? 4300);
const discoveryPort = Number(process.env.DEMO_DISCOVERY_PORT ?? 4301);
if (
  ![apiPort, discoveryPort].every(
    (p) => Number.isInteger(p) && p > 1024 && p <= 65535,
  ) ||
  apiPort === discoveryPort
)
  throw new Error("Invalid demo ports");
const origin = `http://127.0.0.1:${apiPort}`;
const runtime = new SponsorshipRuntime();
let busy = false;
const provider = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/catalogue")
    return json(response, 200, { resources: [offering] });
  json(response, 404, { error: "Unknown provider route" });
});
const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
  );
  if (request.headers.host !== `127.0.0.1:${apiPort}`)
    return json(response, 403, { error: "Use the documented 127.0.0.1 URL" });
  try {
    const url = new URL(request.url ?? "/", origin);
    if (request.method === "GET") {
      if (url.pathname === "/api/health")
        return json(response, 200, {
          status: "ready",
          localOnly: true,
          chainId: 31337,
        });
      if (url.pathname === "/api/state")
        return json(response, 200, await runtime.state());
      if (url.pathname === "/api/receipt") {
        const hash = url.searchParams.get("hash");
        if (!hash || !runtime.audit.some((tx) => tx.hash === hash))
          return json(response, 404, { error: "Unknown session transaction" });
        const receipt = await runtime.provider.getTransactionReceipt(hash);
        return json(response, 200, receipt?.toJSON());
      }
      if (url.pathname === "/api/export")
        return json(response, 200, await runtime.state());
      const staticFiles: Record<string, [string, string]> = {
        "/": ["apps/sponsorship-demo/index.html", "text/html"],
        "/app.js": ["apps/sponsorship-demo/app.js", "text/javascript"],
        "/styles.css": ["apps/sponsorship-demo/styles.css", "text/css"],
        "/sample-photo.svg": [
          "samples/sponsorship/collection-photo.svg",
          "image/svg+xml",
        ],
        "/programme-art.svg": [
          "apps/sponsorship-demo/programme-art.svg",
          "image/svg+xml",
        ],
      };
      const file = staticFiles[url.pathname];
      if (file) {
        response.writeHead(200, {
          "content-type": `${file[1]}; charset=utf-8`,
        });
        return response.end(readFileSync(file[0]));
      }
    }
    if (request.method === "POST") {
      if (request.headers.origin && request.headers.origin !== origin)
        return json(response, 403, { error: "Cross-origin request rejected" });
      if (!request.headers["content-type"]?.startsWith("application/json"))
        return json(response, 415, { error: "JSON required" });
      const role = request.headers["x-demo-role"] as Role;
      if (!roles.includes(role))
        return json(response, 403, { error: "Select a valid local demo role" });
      const input = await body(request);
      if (busy)
        return json(response, 409, {
          error: "Another action is confirming; wait and refresh",
        });
      busy = true;
      try {
        if (url.pathname === "/api/presentation/reset") {
          await runtime.reset();
          return json(response, 200, await runtime.state());
        }
        if (url.pathname === "/api/presentation/chapter") {
          if (
            typeof input.chapter !== "string" ||
            !["funded", "review", "complete"].includes(input.chapter)
          )
            return json(response, 400, {
              error: "Unknown presentation chapter",
            });
          const discovery = await discoverProgrammes(
            `http://127.0.0.1:${discoveryPort}`,
            "PLASTIC-LDPE",
          );
          await runtime.prepareChapter(input.chapter, discovery);
          return json(response, 200, await runtime.state());
        }
        if (url.pathname === "/api/discover") {
          if (role !== "sponsor")
            return json(response, 403, { error: "Sponsor role required" });
          runtime.discovery = await discoverProgrammes(
            `http://127.0.0.1:${discoveryPort}`,
            "PLASTIC-LDPE",
          );
          return json(response, 200, runtime.discovery);
        }
        if (url.pathname === "/api/select") {
          if (
            role !== "sponsor" ||
            !runtime.discovery ||
            input.resourceId !== offering.resourceId
          )
            return json(response, 400, {
              error: "Discover and select the known offering as sponsor",
            });
          runtime.selected = true;
          await runtime.exportState();
          return json(response, 200, {
            agreement: "PRESET_TERMS_AWAIT_AAMHI_ACCEPTANCE",
            termsHash: (await runtime.state()).termsHash,
          });
        }
        const match =
          /^\/api\/milestones\/(1|2)\/(accept|fund|evidence|receipt|verify|release|dispute|propose|approve)$/.exec(
            url.pathname,
          );
        if (match) {
          await runtime.action(role, Number(match[1]), match[2], input);
          return json(response, 200, await runtime.state());
        }
      } finally {
        busy = false;
      }
    }
    json(response, 404, { error: "Unknown route" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    console.error(message);
    json(response, 400, {
      error: message.includes("execution reverted")
        ? "Contract rejected the action. Check role, evidence, funding, verification and joint approvals."
        : message.slice(0, 500),
    });
  }
});

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value));
}
async function body(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  let data = "";
  for await (const chunk of request) {
    data += chunk.toString();
    if (Buffer.byteLength(data) > 65536)
      throw new Error("Request exceeds 64 KiB");
  }
  const value: unknown = JSON.parse(data || "{}");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("JSON object required");
  return value as Record<string, unknown>;
}
function listen(service: typeof server, port: number) {
  return new Promise<void>((done, reject) => {
    service.once("error", reject);
    service.listen(port, "127.0.0.1", done);
  });
}
function stop() {
  server.close();
  provider.close();
  runtime.stop();
}
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
try {
  await listen(provider, discoveryPort);
  await runtime.start();
  await runtime.exportState();
  await listen(server, apiPort);
  console.log(
    `Aamhi sponsorship demo ready: ${origin}\nLocal chain: 127.0.0.1:18545 | Discovery provider: 127.0.0.1:${discoveryPort}\nControlled local accounts; sample evidence; sandbox value. Ctrl+C stops the owned chain. Each launch starts a fresh session.`,
  );
} catch (error) {
  console.error(error);
  stop();
  process.exit(1);
}
