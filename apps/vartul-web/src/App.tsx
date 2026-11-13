import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useApi } from "./lib/api";
import { dateTime } from "./lib/format";
import { Link, match, navigate, useLocation } from "./lib/router";
import { DirectoryProvider } from "./lib/directory";
import { Button, Loading, Simulated, ToastHost, roleColour } from "./components/ui";
import { Presenter } from "./components/Presenter";

const Network = lazy(() => import("./pages/Network"));
const Explorer = lazy(() => import("./pages/Explorer"));
const Programmes = lazy(() => import("./pages/Programmes"));
const Programme = lazy(() => import("./pages/Programme"));
const Lots = lazy(() => import("./pages/Lots"));
const Lot = lazy(() => import("./pages/Lot"));
const Sponsor = lazy(() => import("./pages/Sponsor"));
const Originator = lazy(() => import("./pages/Originator"));
const Field = lazy(() => import("./pages/Field"));
const Verifier = lazy(() => import("./pages/Verifier"));
const Facility = lazy(() => import("./pages/Facility"));
const Panchayat = lazy(() => import("./pages/Panchayat"));
const Verify = lazy(() => import("./pages/Verify"));
const Anomalies = lazy(() => import("./pages/Anomalies"));
const Scenes = lazy(() => import("./pages/Scenes"));
const Participant = lazy(() => import("./pages/Participant"));

const routes: [string, (p: Record<string, string>) => ReactNode][] = [
  ["/network", () => <Network />],
  ["/network/explorer", () => <Explorer />],
  ["/network/explorer/tx/:hash", (p) => <Explorer tx={p.hash} />],
  ["/programmes", () => <Programmes />],
  ["/programmes/:code", (p) => <Programme code={p.code} />],
  ["/lots", () => <Lots />],
  ["/lots/:code", (p) => <Lot code={p.code} />],
  ["/sponsor", () => <Sponsor />],
  ["/originator", () => <Originator />],
  ["/field", () => <Field />],
  ["/verifier", () => <Verifier />],
  ["/facility", () => <Facility />],
  ["/panchayat", () => <Panchayat village="NDG" />],
  ["/panchayat/:village", (p) => <Panchayat village={p.village} />],
  ["/verify", () => <Verify />],
  ["/verify/:id", (p) => <Verify id={p.id} />],
  ["/anomalies", () => <Anomalies />],
  ["/present", () => <Scenes />],
  ["/participants/:code", (p) => <Participant code={p.code} />],
];

const nav: { group: string; items: [string, string, string][] }[] = [
  {
    group: "Network",
    items: [
      ["/network", "Overview", "network"],
      ["/programmes", "Programmes", "network"],
      ["/lots", "Recovery lots", "network"],
      ["/network/explorer", "Ledger explorer", "network"],
    ],
  },
  {
    group: "Participants",
    items: [
      ["/sponsor", "Sponsor portal", "sponsor"],
      ["/originator", "Aamhi operations", "originator"],
      ["/field", "Field app", "originator"],
      ["/verifier", "Verifier console", "verifier"],
      ["/facility", "Recycler console", "facility"],
      ["/panchayat/NDG", "Gram Panchayat", "panchayat"],
    ],
  },
  {
    group: "Public",
    items: [
      ["/verify", "Verify a certificate", "public"],
      ["/anomalies", "Anomaly register", "public"],
      ["/present", "Demonstration scenes", "public"],
    ],
  },
];

function Sidebar({ path }: { path: string }) {
  const active = (to: string) => {
    const base = to.split("?")[0];
    if (base === "/network") return path === "/network";
    if (base.startsWith("/panchayat")) return path.startsWith("/panchayat");
    return path === base || path.startsWith(`${base}/`);
  };
  return (
    <aside className="sidebar">
      <Link to="/network" className="brand" aria-label="Vartul by Suma, home">
        <div className="brand-name">Vartul</div>
        <div className="brand-by">
          by <img src="/brand/logo-suma-full-reversed.png" alt="Suma" />
        </div>
      </Link>
      {nav.map((g) => (
        <nav className="nav-group" key={g.group} aria-label={g.group}>
          <div className="nav-label">{g.group}</div>
          {g.items.map(([to, label, role]) => (
            <Link key={to} to={to} className={`nav-item ${active(to) ? "active" : ""}`}>
              <span className="nav-dot" style={{ background: role === "network" ? "var(--suma-cyan-300)" : roleColour[role] }} />
              {label}
            </Link>
          ))}
        </nav>
      ))}
      <div className="sidebar-foot">
        Sandbox network on the Raigad coast. Organisations other than Project Aamhi are fictional; payments, identity and the chain are simulated.
      </div>
    </aside>
  );
}

function Topbar({ presenter, togglePresenter }: { presenter: boolean; togglePresenter: () => void }) {
  const { data } = useApi<{ now: number; scene?: string }>("/api/clock");
  return (
    <header className="topbar">
      <div className="clock" title="Sandbox clock. Time is controlled by the demonstration, not the wall clock.">
        <small>Sandbox time</small>
        {data ? dateTime(data.now) : "…"}
      </div>
      <Simulated>Sandbox</Simulated>
      <div className="spacer" />
      <div className="lang" title="The interface is in English. Marathi is a product requirement and is coming soon.">
        <b>English</b>
        <span>·</span>
        <span>मराठी coming soon</span>
      </div>
      <Button variant={presenter ? "primary" : "secondary"} size="sm" onClick={togglePresenter} aria-pressed={presenter}>
        {presenter ? "Hide presenter" : "Presenter"}
      </Button>
    </header>
  );
}

export function App() {
  const { path } = useLocation();
  const [presenter, setPresenter] = useState(() => {
    try {
      return localStorage.getItem("vartul.presenter") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("vartul.presenter", presenter ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, [presenter]);
  useEffect(() => {
    if (path === "/" || path === "") navigate("/network", true);
  }, [path]);

  let page: ReactNode = (
    <div className="page">
      <h1 className="page-title">Page not found</h1>
      <p>
        <Link to="/network">Return to the network overview</Link>
      </p>
    </div>
  );
  for (const [pattern, render] of routes) {
    const params = match(pattern, path);
    if (params) {
      page = render(params);
      break;
    }
  }

  return (
    <ToastHost>
      <DirectoryProvider>
        <div className="shell">
          <Sidebar path={path} />
          <div className="main">
            <Topbar presenter={presenter} togglePresenter={() => setPresenter((p) => !p)} />
            <div className="content-wrap">
              <main className="content">
                <Suspense fallback={<Loading />}>{page}</Suspense>
              </main>
              {presenter && <Presenter onClose={() => setPresenter(false)} />}
            </div>
          </div>
        </div>
      </DirectoryProvider>
    </ToastHost>
  );
}
