import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Ledger version: bumped after every action or scene change so every view refetches. */
let version = 0;
const listeners = new Set<() => void>();
export const bump = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useLedgerVersion = () => useSyncExternalStore(subscribe, () => version);

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function get<T = any>(path: string): Promise<T> {
  const r = await fetch(path);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(body.error ?? `${r.status} ${r.statusText}`, r.status);
  return body as T;
}

export async function post<T = any>(path: string, body: unknown = {}): Promise<T> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(json.error ?? `${r.status} ${r.statusText}`, r.status);
  return json as T;
}

export interface ApiState<T> {
  data?: T;
  error?: string;
  loading: boolean;
  reload: () => void;
}

/** Fetch a read model; refetches when the path or the ledger version changes. Keeps stale data while reloading. */
export function useApi<T = any>(path: string | null): ApiState<T> {
  const v = useLedgerVersion();
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean; path?: string }>({ loading: !!path });
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  useEffect(() => {
    if (!path) return;
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, ...(s.path !== path ? { data: undefined, error: undefined } : {}) }));
    get<T>(path).then(
      (data) => mine === seq.current && setState({ data, loading: false, path }),
      (e: Error) => mine === seq.current && setState({ error: e.message, loading: false, path }),
    );
  }, [path, v, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.path === path ? state.data : undefined, error: state.error, loading: state.loading, reload };
}
