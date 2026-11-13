import type { IncomingMessage, ServerResponse } from "node:http";
import { DomainError } from "../lib/util.js";

export type Handler = (ctx: {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
}) => Promise<unknown> | unknown;

interface Route {
  raw?: boolean;
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

/** Minimal router: `/api/lots/:code` style patterns, JSON in and out. */
export class Router {
  private routes: Route[] = [];

  on(method: string, path: string, handler: Handler, raw = false) {
    const keys: string[] = [];
    const pattern = new RegExp(
      `^${path.replace(/:([a-zA-Z]+)/g, (_, k) => {
        keys.push(k);
        return "([^/]+)";
      })}$`,
    );
    this.routes.push({ method, pattern, keys, handler, raw });
    return this;
  }

  /** POST route whose handler reads the raw body itself (signed Beckn messages). */
  rawPost = (path: string, h: Handler) => this.on("POST", path, h, true);

  get = (path: string, h: Handler) => this.on("GET", path, h);
  post = (path: string, h: Handler) => this.on("POST", path, h);

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    for (const r of this.routes) {
      if (r.method !== req.method) continue;
      const m = url.pathname.match(r.pattern);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      try {
        const body = req.method === "POST" && !r.raw ? await readJson(req) : undefined;
        const result = await r.handler({ req, res, params, query: url.searchParams, body });
        if (!res.headersSent && result !== undefined) send(res, 200, result);
      } catch (error) {
        const status = error instanceof DomainError ? error.status : 500;
        const code = error instanceof DomainError ? error.code : "INTERNAL";
        if (status >= 500 && !(error instanceof DomainError)) console.error(error);
        if (!res.headersSent) send(res, status, { error: (error as Error).message, code });
      }
      return true;
    }
    return false;
  }
}

export async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 1_000_000) throw new DomainError("Request body too large", 413);
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError("Body must be JSON", 400);
  }
}

export function send(res: ServerResponse, status: number, body: unknown, type = "application/json") {
  const payload =
    type === "application/json" ? JSON.stringify(body, (_, v) => (typeof v === "bigint" ? v.toString() : v)) : String(body);
  res.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}
