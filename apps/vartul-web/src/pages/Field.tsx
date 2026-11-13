import { useState } from "react";
import { useApi } from "../lib/api";
import { dateTime, inr, kg, shortDate } from "../lib/format";
import { Link, setQuery, useLocation } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, ErrorNote, Field as FormField, KV, Loading, PageHead, Simulated, useAction } from "../components/ui";

const MATERIALS = ["PET", "HDPE", "LDPE", "MLP", "THERMOCOL", "GLASS", "FOOTWEAR", "NETS", "TEXTILE"];
const statusTone: Record<string, string> = { paid: "success", verified: "brand", rejected: "danger", "under review": "warning", "under challenge": "warning", voided: "danger" };

export default function FieldApp() {
  const { query } = useLocation();
  const dir = useDirectory();
  const saathi = query.get("saathi") ?? "SS-MRD-0017";
  const { data: s, error } = useApi<any>(`/api/saathis/${saathi}`);
  const [tab, setTab] = useState<"capture" | "records" | "earnings">(query.get("tab") === "earnings" ? "earnings" : "capture");
  const meta = dir.saathis.find((x) => x.id === saathi);
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!s || !meta) return <Loading />;

  return (
    <div className="page">
      <PageHead
        role="originator"
        eyebrow={<>Field app <Simulated>Simulated device</Simulated></>}
        title="What the safai saathi sees"
        lead="A phone app that works offline. Each bag is weighed, photographed and located, then signed with a key held on the collector's device. Her name stays on her phone and in Aamhi's private records; the ledger sees only a pseudonymous account."
        actions={
          <FormField label="Collector">
            <select className="select" value={saathi} onChange={(e) => setQuery("saathi", e.target.value)}>
              {dir.saathis.map((x) => (
                <option key={x.id} value={x.id}>{x.id}{x.id === "SS-MRD-0017" ? " (Sunanda)" : ""} · {dir.shortName(x.org)}</option>
              ))}
            </select>
          </FormField>
        }
      />
      <div className="row" style={{ alignItems: "flex-start", gap: 32 }}>
        <div className="phone" aria-label="Field app on the collector's phone">
          <div className="phone-status">
            <span>Vartul Saathi</span>
            <span>4G · synced</span>
          </div>
          <div className="phone-head">
            <div className="who">{s.name}</div>
            <div className="org">{s.orgName} · {s.villages.join(", ")} · <span className="mono">{s.id}</span></div>
          </div>
          <div className="phone-body">
            {tab === "capture" && <Capture saathi={saathi} villages={meta.villages} onDone={() => setTab("records")} />}
            {tab === "records" && <Records records={s.records} />}
            {tab === "earnings" && <Earnings s={s} />}
          </div>
          <nav className="phone-tabs">
            {(["capture", "records", "earnings"] as const).map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                {t === "capture" ? "New bag" : t === "records" ? "My bags" : "Earnings"}
              </button>
            ))}
          </nav>
        </div>
        <div className="stack" style={{ flex: 1, minWidth: 280 }}>
          <Card title="What leaves the phone">
            <KV
              items={[
                ["Signed on device", "Weight, material, route, GPS fix, time and the photo's fingerprint"],
                ["Sent to Aamhi", "The record and the compressed photo, over an encrypted queue when signal returns"],
                ["On the ledger", "Only the Merkle root of each lot's record fingerprints, and the collector's pseudonymous account for payouts"],
                ["Never on the ledger", "Name, phone number, bank or UPI details, photos"],
              ]}
            />
          </Card>
          <Card title="This collector at a glance">
            <KV
              items={[
                ["Bags recorded", s.totals.records],
                ["Captured", kg(s.totals.capturedKg, 1)],
                ["Verified", kg(s.totals.verifiedKg, 1)],
                ["Incentives received", inr(s.totals.paidInr, 2)],
                ["Excluded by verifiers", s.exclusions.length ? s.exclusions.map((e: any) => `${kg(e.kg)} in ${e.lot}`).join("; ") : "None"],
              ]}
            />
          </Card>
          <Alert tone="sim" title="Simulated in this sandbox">
            {s.simulated} Marathi-first interface, voice prompts and offline storage are product requirements (FA-01 to FA-10); this view shows the same data flow.
          </Alert>
        </div>
      </div>
    </div>
  );
}

function Capture({ saathi, villages, onDone }: { saathi: string; villages: string[]; onDone: () => void }) {
  const dir = useDirectory();
  const { run, busy } = useAction();
  const routes = [
    ...villages.map((v) => ({ village: v, route: dir.villages.find((x) => x.code === v) ? `${dir.village(v)} door-to-door route` : `${dir.village(v)} collection route` })),
    ...(villages.includes("KRL") ? [{ village: "KRL", route: "Korlai shore route" }] : []),
    ...(villages.includes("KSD") ? [{ village: "KSD", route: "Kashid beach route" }] : []),
  ];
  const [route, setRoute] = useState(routes.length - 1);
  const [material, setMaterial] = useState(villages.includes("KRL") ? "LDPE" : "PET");
  const [weight, setWeight] = useState(saathi === "SS-MRD-0017" ? 12.4 : 8.0);
  const [photo, setPhoto] = useState(false);
  const [last, setLast] = useState<any>(null);

  if (last) {
    return (
      <div className="stack">
        <Alert tone="success" title="Bag signed and synced">
          <span className="mono">{last.id}</span>
        </Alert>
        <img className="evidence-photo" src={`/api/evidence/${last.id}`} alt="Captured bag" />
        <KV
          items={[
            ["Weight", kg(last.grams / 1000)],
            ["Material", dir.material(last.material)],
            ["Route", last.route],
            ["Time", dateTime(last.capturedAt)],
            ["Signature", last.deviceSigned ? "Valid device signature" : "—"],
          ]}
        />
        <Button variant="secondary" onClick={() => { setLast(null); setPhoto(false); }}>Record another bag</Button>
        <Button variant="ghost" onClick={onDone}>See my bags</Button>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <FormField label="Route">
        <select className="select" value={route} onChange={(e) => setRoute(Number(e.target.value))}>
          {routes.map((r, i) => (
            <option key={r.route} value={i}>{r.route}</option>
          ))}
        </select>
      </FormField>
      <div className="field">
        <span>Material</span>
        <div className="mat-grid">
          {MATERIALS.map((m) => (
            <button key={m} className={`mat ${material === m ? "active" : ""}`} onClick={() => setMaterial(m)} aria-pressed={material === m}>
              <span className="mat-swatch" style={{ background: dir.materials[m]?.colour }} />
              {dir.material(m).split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Weight from the route scale</span>
        <div className="row" style={{ justifyContent: "center", gap: 16 }}>
          <Button variant="secondary" onClick={() => setWeight((w) => Math.max(0.1, Math.round((w - 0.1) * 10) / 10))} aria-label="Decrease weight">−</Button>
          <div className="big-weight">{weight.toFixed(1)}<span style={{ fontSize: 18 }}> kg</span></div>
          <Button variant="secondary" onClick={() => setWeight((w) => Math.min(80, Math.round((w + 0.1) * 10) / 10))} aria-label="Increase weight">+</Button>
        </div>
        <input type="range" min={0.5} max={50} step={0.1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} aria-label="Weight" />
      </div>
      <Button variant={photo ? "secondary" : "primary"} onClick={() => setPhoto(true)}>{photo ? "Photo taken (in-app camera)" : "Take photo of the bag"}</Button>
      <div className="small muted">GPS fix ready · ±12 m · {routes[route]?.route}</div>
      <Button
        disabled={!photo}
        loading={busy === "capture"}
        onClick={async () => {
          const r = await run<any>("capture", "/api/field/capture", { saathi, material, kg: weight, village: routes[route].village, route: routes[route].route }, () => "Bag signed and synced");
          if (r) setLast(r);
        }}
      >
        Sign and save
      </Button>
    </div>
  );
}

function Records({ records }: { records: any[] }) {
  if (!records.length) return <div className="empty">No bags yet.</div>;
  return (
    <div className="stack" style={{ gap: 8 }}>
      {records.slice(0, 40).map((r) => (
        <div key={r.id} className="card" style={{ padding: "10px 12px" }}>
          <div className="row between">
            <span className="strong">{kg(r.kg)} {r.material}</span>
            <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status}</Badge>
          </div>
          <div className="small muted">{shortDate(r.capturedAt)} · {r.route}</div>
          {r.lot && <div className="small"><Link to={`/lots/${r.lot}`} className="mono">{r.lot}</Link></div>}
          {r.flags.length > 0 && <div className="small" style={{ color: "var(--status-warning)" }}>Flagged: {r.flags.join(", ").toLowerCase().replace(/_/g, " ")}</div>}
        </div>
      ))}
    </div>
  );
}

function Earnings({ s }: { s: any }) {
  const { run, busy } = useAction();
  const [credential, setCredential] = useState<any>(null);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="card" style={{ padding: 14, borderTop: "3px solid var(--role-originator)" }}>
        <div className="small muted">Incentives received</div>
        <div className="big-weight" style={{ textAlign: "left" }}>{inr(s.totals.paidInr)}</div>
        <div className="small muted">for {kg(s.totals.verifiedKg, 0)} verified</div>
      </div>
      {s.exclusions.map((e: any) => (
        <Alert key={e.lot} tone="warning" title={`${kg(e.kg)} not paid in ${e.lot}`}>{e.reason}</Alert>
      ))}
      <div className="eyebrow">Payouts</div>
      {s.payouts.slice(0, 25).map((p: any) => (
        <div key={p.id} className="card" style={{ padding: "10px 12px" }}>
          <div className="row between">
            <span className="strong mono">{inr(p.amountInr, 2)}</span>
            <Badge tone="success">UPI credited</Badge>
          </div>
          <div className="small muted">{dateTime(p.completedAt)} · {kg(p.grams / 1000)} in <Link to={`/lots/${p.lot}`} className="mono">{p.lot}</Link></div>
          <div className="small mono muted">UTR {p.utr} · {p.vpa}</div>
        </div>
      ))}
      <div className="divider" />
      {credential ? (
        <Alert tone="success" title="Work record issued to you">
          Credential <Link to={`/verify/${credential.id}`} className="mono">{credential.id}</Link>. Anyone you show it to can check it.
        </Alert>
      ) : (
        <Button variant="secondary" loading={busy === "wr"} onClick={async () => setCredential(await run<any>("wr", `/api/saathis/${s.id}/work-record`, {}, () => "Work record issued at your request"))}>
          Export my work record
        </Button>
      )}
      <p className="small muted">Issued only when you ask. It proves verified work and incentives without revealing your name.</p>
    </div>
  );
}
