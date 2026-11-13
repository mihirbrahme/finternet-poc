import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

/** Minimal history router: no dependency, deep links work because the server falls back to index.html. */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
window.addEventListener("popstate", notify);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => window.location.pathname + window.location.search;

export function navigate(to: string, replace = false) {
  if (to === snapshot()) return;
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  document.querySelector(".content")?.scrollTo({ top: 0 });
  notify();
}

export function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(href, window.location.origin);
  return { path: url.pathname, query: url.searchParams, href };
}

/** Update one query parameter in place (e.g. switching the acting participant). */
export function setQuery(key: string, value: string | undefined) {
  const url = new URL(window.location.href);
  if (value === undefined) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  navigate(url.pathname + url.search, true);
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      href={to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}

/** Match a pattern like /lots/:code against a path. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}
