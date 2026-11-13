import { createContext, useCallback, useContext, useState, type ReactNode, type CSSProperties } from "react";
import { bump, post } from "../lib/api";
import { claimTones, claimTypes, lotStates, programmeTones, short } from "../lib/format";
import { Link } from "../lib/router";

export type Tone = "neutral" | "success" | "warning" | "danger" | "brand" | "inverse" | "sim";

export const roleColour: Record<string, string> = {
  sponsor: "var(--role-sponsor)",
  originator: "var(--role-originator)",
  ngo: "var(--role-originator)",
  facility: "var(--role-facility)",
  recycler: "var(--role-facility)",
  verifier: "var(--role-verifier)",
  panchayat: "var(--role-panchayat)",
  public: "var(--role-public)",
  network: "var(--role-network)",
};

export function Badge({ tone = "neutral", dot, children, title }: { tone?: Tone | string; dot?: boolean; children: ReactNode; title?: string }) {
  return (
    <span className={`badge ${tone}`} title={title}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export const LotState = ({ state }: { state: string }) => (
  <Badge tone={lotStates[state]?.tone ?? "neutral"} dot>
    {lotStates[state]?.label ?? state}
  </Badge>
);
export const ClaimStatus = ({ status }: { status: string }) => (
  <Badge tone={claimTones[status] ?? "neutral"} dot>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </Badge>
);
export const ProgrammeStatus = ({ status }: { status: string }) => (
  <Badge tone={programmeTones[status] ?? "neutral"} dot>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </Badge>
);
export const ClaimType = ({ type }: { type: string }) => <span className="tag">{claimTypes[type] ?? type}</span>;
export const Simulated = ({ children = "Simulated" }: { children?: ReactNode }) => (
  <Badge tone="sim" title="This element stands in for a real-world system in the sandbox">
    {children}
  </Badge>
);

export function Button({
  variant = "primary",
  size,
  loading,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse"; size?: "sm"; loading?: boolean }) {
  return (
    <button className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

export function Card({ title, sub, actions, children, flush, className = "", style }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="card-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <h3>{title}</h3>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className={`card-body ${flush ? "flush" : ""}`}>{children}</div>
    </section>
  );
}

export function Stat({ value, label, detail, accent }: { value: ReactNode; label: ReactNode; detail?: ReactNode; accent?: string }) {
  return (
    <div className="stat" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {detail && <div className="stat-detail">{detail}</div>}
    </div>
  );
}

export function PageHead({ eyebrow, title, lead, role, actions }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; role?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {role && <div className="role-rule" style={{ background: roleColour[role] ?? roleColour.public }} />}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function Alert({ tone = "info", title, children, action }: { tone?: "info" | "warning" | "danger" | "success" | "sim"; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`alert ${tone}`}>
      <div style={{ flex: 1 }}>
        <div className="alert-title">{title}</div>
        {children && <div className="alert-body">{children}</div>}
      </div>
      {action}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  num?: boolean;
  mono?: boolean;
  width?: number | string;
}

export function Table<T>({ columns, rows, onRow, empty = "Nothing to show yet.", selected, rowKey }: { columns: Column<T>[]; rows: T[]; onRow?: (row: T) => void; empty?: ReactNode; selected?: (row: T) => boolean; rowKey?: (row: T, i: number) => string }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width, textAlign: c.num ? "right" : undefined }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r, i) : i} className={`${onRow ? "clickable" : ""} ${selected?.(r) ? "selected" : ""}`} onClick={onRow ? () => onRow(r) : undefined}>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? "num" : c.mono ? "mono" : undefined}>
                  {c.render ? c.render(r) : String((r as any)[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: ReactNode; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={`tab ${t.id === value ? "active" : ""}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function KV({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([k, v], i) => (
        <div key={i} style={{ display: "contents" }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Progress({ value, max = 1, colour }: { value: number; max?: number; colour?: string }) {
  const w = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${w}%`, background: colour }} />
    </div>
  );
}

/** A hash or identifier; click to copy. */
export function Hash({ value, n = 6, href }: { value?: string; n?: number; href?: string }) {
  const toast = useToast();
  if (!value) return <span className="muted">—</span>;
  if (href) return <Link to={href} className="hash" title={value}>{short(value, n)}</Link>;
  return (
    <button
      className="hash"
      title={`${value} (click to copy)`}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value).then(() => toast.show({ title: "Copied", body: short(value, 10) }));
      }}
    >
      {short(value, n)}
    </button>
  );
}

export const TxLink = ({ hash }: { hash?: string }) => (hash ? <Hash value={hash} href={`/network/explorer/tx/${hash}`} /> : <span className="muted">—</span>);
export const LotLink = ({ code }: { code: string }) => <Link to={`/lots/${code}`} className="mono">{code}</Link>;

export const Loading = () => (
  <div className="loading">
    <span className="spinner" />
  </div>
);
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
export const ErrorNote = ({ error }: { error?: string }) => (error ? <Alert tone="danger" title="Could not load this view">{error}</Alert> : null);

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

// ---------------------------------------------------------------- toasts and actions

interface ToastMsg {
  id: number;
  title: string;
  body?: ReactNode;
  error?: boolean;
}
const ToastCtx = createContext<{ show: (t: Omit<ToastMsg, "id">) => void }>({ show: () => undefined });
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const show = useCallback((t: Omit<ToastMsg, "id">) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.error ? 9000 : 5000);
  }, []);
  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.error ? "error" : ""}`}>
            <b>{t.title}</b>
            {t.body}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Run a ledger action: POST, toast the outcome, refresh every view. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = useCallback(
    async <T = any,>(key: string, path: string, body: unknown, success: (r: T) => string): Promise<T | undefined> => {
      setBusy(key);
      try {
        const r = await post<T>(path, body);
        toast.show({ title: success(r), body: (r as any)?.tx ? <span className="mono">Transaction {short((r as any).tx, 8)}</span> : undefined });
        bump();
        return r;
      } catch (e) {
        toast.show({ title: "The ledger rejected this action", body: (e as Error).message, error: true });
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );
  return { run, busy };
}
