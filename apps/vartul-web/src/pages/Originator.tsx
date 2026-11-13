import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { inr, kg, shortDate } from "../lib/format";
import { Link, navigate, setQuery, useLocation } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, ErrorNote, Field, Loading, LotLink, LotState, PageHead, Stat, Table, Tabs, useAction } from "../components/ui";
import { RecordDrawer } from "../components/RecordDrawer";

const ORGS = ["AAMHI", "SAGAR", "HIRWAI"];

export default function Originator() {
  const { query } = useLocation();
  const org = ORGS.includes(query.get("as") ?? "") ? query.get("as")! : "AAMHI";
  const dir = useDirectory();
  const { data: me, error } = useApi<any>(`/api/participants/${org}`);
  const { data: lots } = useApi<any[]>("/api/lots");
  const { data: available } = useApi<any[]>(`/api/field/available?org=${org}`);
  const { data: anomalies } = useApi<any>("/api/anomalies");
  const [tab, setTab] = useState(query.get("tab") ?? "mrc");
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!me || !lots || !available) return <Loading />;

  const mine = lots.filter((l) => l.originator === org);
  const toDispatch = mine.filter((l) => l.state === "MINTED");
  const inFlight = mine.filter((l) => ["IN_TRANSIT", "RECEIVED", "VERIFIED", "CHALLENGED", "UNDER_REVIEW"].includes(l.state));
  const forSale = mine.filter((l) => l.state === "SETTLED" && !l.sold);
  const flags = (anomalies?.records ?? []).filter((r: any) => r.org === org);
  const collectors = dir.saathis.filter((s) => s.org === org);

  return (
    <div className="page">
      <PageHead
        role="originator"
        eyebrow="Originator operations"
        title={me.name}
        lead="Aggregate signed collection records into recovery lots at the MRC, move them through custody to recyclers, and see what verification and settlement returned to your collectors."
        actions={
          <Field label="Acting as">
            <select className="select" value={org} onChange={(e) => setQuery("as", e.target.value)}>
              {ORGS.map((o) => (
                <option key={o} value={o}>{dir.name(o)}</option>
              ))}
            </select>
          </Field>
        }
      />
      <div className="grid g4">
        <Stat value={available.length} label="Synced records awaiting aggregation" detail={kg(available.reduce((s, r) => s + r.grams, 0) / 1000, 0)} accent="var(--role-originator)" />
        <Stat value={inFlight.length} label="Lots in custody or verification" detail={`${toDispatch.length} awaiting dispatch`} accent="var(--role-originator)" />
        <Stat value={flags.length} label="Flagged records" detail="Reviewed before money moves" accent={flags.length ? "var(--status-warning)" : "var(--role-originator)"} />
        <Stat value={collectors.length} label="Registered collectors" detail="Pseudonymous on the ledger" accent="var(--role-originator)" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "mrc", label: "MRC aggregation", count: available.length },
          { id: "lots", label: "Lots in progress", count: toDispatch.length + inFlight.length },
          { id: "sales", label: "Material sales", count: forSale.length },
          { id: "anomalies", label: "Anomaly inbox", count: flags.length },
          { id: "collectors", label: "Collectors", count: collectors.length },
        ]}
      />
      {tab === "mrc" && <Mrc org={org} available={available} programmes={me.programmes.filter((p: any) => p.status === "ACTIVE")} />}
      {tab === "lots" && <LotsInProgress toDispatch={toDispatch} inFlight={inFlight} />}
      {tab === "sales" && <Sales lots={forSale} />}
      {tab === "anomalies" && (
        <Card flush title="Flagged records" sub="The engine flags; people decide. Flags travel with the lot into the verifier's sampling plan.">
          <Table
            empty="No flagged records."
            rowKey={(r: any) => r.record}
            columns={[
              { key: "r", header: "Record", render: (r: any) => <span className="mono small">{r.record}</span> },
              { key: "s", header: "Collector", render: (r: any) => <span className="mono">{r.saathi}</span> },
              { key: "kg", header: "Weight", num: true, render: (r: any) => kg(r.kg) },
              { key: "f", header: "Flags", render: (r: any) => <div className="stack" style={{ gap: 4 }}>{r.flags.map((f: any) => <span key={f.code} className="small"><Badge tone={f.severity === "high" ? "danger" : "warning"}>{f.code.toLowerCase().replace(/_/g, " ")}</Badge> {f.explanation}</span>)}</div> },
              { key: "lot", header: "Lot", render: (r: any) => (r.lot ? <LotLink code={r.lot} /> : <span className="small muted">Not yet aggregated</span>) },
            ]}
            rows={flags}
          />
        </Card>
      )}
      {tab === "collectors" && (
        <Card flush>
          <Table
            rowKey={(s: any) => s.id}
            onRow={(s: any) => navigate(`/field?saathi=${s.id}`)}
            columns={[
              { key: "id", header: "Collector", render: (s: any) => <span className="mono">{s.id}</span> },
              { key: "v", header: "Villages", render: (s: any) => s.villages.map((v: string) => dir.village(v)).join(", ") },
              { key: "open", header: "", render: () => <span className="small">Open field app view</span> },
            ]}
            rows={collectors}
          />
        </Card>
      )}
    </div>
  );
}

function Mrc({ org, available, programmes }: { org: string; available: any[]; programmes: any[] }) {
  const dir = useDirectory();
  const { run, busy } = useAction();
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of available) m.set(r.material, [...(m.get(r.material) ?? []), r]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [available]);
  const [material, setMaterial] = useState<string | null>(null);
  const active = material ?? groups[0]?.[0] ?? null;
  const records = groups.find(([m]) => m === active)?.[1] ?? [];
  const totalKg = records.reduce((s, r) => s + r.grams, 0) / 1000;
  const eligibleProgrammes = programmes.filter((p) => p.materials.includes(active));
  const [programme, setProgramme] = useState("");
  const [contamination, setContamination] = useState("");
  const [weighed, setWeighed] = useState("");
  const [record, setRecord] = useState<string | null>(null);
  const prog = programme || eligibleProgrammes[0]?.code || "";
  const net = totalKg - (Number(contamination) || 0);
  const w = Number(weighed) || 0;
  const withinTolerance = w > 0 && w <= net * 1.01;
  const flagged = records.filter((r) => r.flags.length);

  if (!groups.length) return <Card><div className="empty">No synced records are waiting. New field captures appear here as they sync.</div></Card>;
  return (
    <div className="grid g-wide">
      <Card
        title="Synced records by material"
        sub="Each record is signed on the collector's device and co-signed by the route supervisor"
        flush
        actions={
          <select className="select" style={{ width: 220 }} value={active ?? ""} onChange={(e) => { setMaterial(e.target.value); setProgramme(""); }} aria-label="Material">
            {groups.map(([m, rs]) => (
              <option key={m} value={m}>{dir.material(m)} ({rs.length})</option>
            ))}
          </select>
        }
      >
        <div className="scroll"><Table
          rowKey={(r: any) => r.id}
          onRow={(r: any) => setRecord(r.id)}
          columns={[
            { key: "id", header: "Record", render: (r: any) => <span className="mono small">{r.id}</span> },
            { key: "s", header: "Collector", render: (r: any) => <span className="mono small">{r.saathi}</span> },
            { key: "route", header: "Route", render: (r: any) => <span className="small">{r.route}</span> },
            { key: "at", header: "Captured", render: (r: any) => <span className="small">{shortDate(r.capturedAt)}</span> },
            { key: "kg", header: "Weight", num: true, render: (r: any) => kg(r.grams / 1000) },
            { key: "f", header: "", render: (r: any) => (r.flags.length ? <Badge tone="warning">{r.flags.map((f: string) => f.toLowerCase().replace(/_/g, " ")).join(", ")}</Badge> : null) },
          ]}
          rows={records.slice().sort((a, b) => b.capturedAt - a.capturedAt)}
        /></div>
      </Card>
      <div className="stack">
        <Card title="Weigh and mint a recovery lot" sub="The ledger rejects a lot whose weight exceeds captured inputs net of contamination by more than 1%">
          <div className="stack">
            <div className="kv">
              <dt>Records</dt><dd className="mono">{records.length} from {new Set(records.map((r) => r.saathi)).size} collectors</dd>
              <dt>Captured</dt><dd className="mono">{kg(totalKg, 1)}</dd>
              <dt>Window</dt><dd className="small">{shortDate(Math.min(...records.map((r) => r.capturedAt)))} to {shortDate(Math.max(...records.map((r) => r.capturedAt)))}</dd>
            </div>
            {flagged.length > 0 && <Alert tone="warning" title={`${flagged.length} flagged record${flagged.length > 1 ? "s" : ""} will travel with this lot`}>The verifier's sampling plan includes every flagged record.</Alert>}
            <Field label="Programme">
              <select className="select" value={prog} onChange={(e) => setProgramme(e.target.value)}>
                {eligibleProgrammes.length === 0 && <option value="">No active programme covers this material</option>}
                {eligibleProgrammes.map((p) => (
                  <option key={p.code} value={p.code}>{p.title}</option>
                ))}
              </select>
            </Field>
            <div className="grid g2" style={{ gap: 12 }}>
              <Field label="Contamination removed (kg)">
                <input className="input mono" inputMode="decimal" value={contamination} onChange={(e) => setContamination(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Bale weight on MRC scale (kg)">
                <input className="input mono" inputMode="decimal" value={weighed} onChange={(e) => setWeighed(e.target.value)} placeholder={net > 0 ? net.toFixed(1) : ""} />
              </Field>
            </div>
            {w > 0 && (
              <div className="small">
                Mass balance: {kg(w, 1)} weighed against {kg(net, 1)} net of contamination{" "}
                {withinTolerance ? <Badge tone="success" dot>Within tolerance</Badge> : <Badge tone="danger" dot>Exceeds inputs; the ledger will reject it</Badge>}
              </div>
            )}
            <Button
              disabled={!prog || !w}
              loading={busy === "mint"}
              onClick={async () => {
                const r = await run<any>("mint", "/api/mrc/mint", { programme: prog, material: active, records: records.map((x) => x.id), contaminationKg: Number(contamination) || 0, aggregatedKg: w }, (r) => `${r.code} minted`);
                if (r?.code) navigate(`/lots/${r.code}`);
              }}
            >
              Mint lot on the ledger
            </Button>
            <p className="small muted">Minting anchors a Merkle root over all {records.length} record fingerprints, signed by {dir.shortName(org)}'s MRC key.</p>
          </div>
        </Card>
      </div>
      {record && <RecordDrawer record={record} onClose={() => setRecord(null)} />}
    </div>
  );
}

function LotsInProgress({ toDispatch, inFlight }: { toDispatch: any[]; inFlight: any[] }) {
  const dir = useDirectory();
  const { run, busy } = useAction();
  const recyclers = dir.ofKind("recycler");
  const [receiver, setReceiver] = useState<Record<string, string>>({});
  return (
    <div className="stack">
      {toDispatch.length > 0 && (
        <Card title="Ready to dispatch" flush>
          <Table
            rowKey={(l: any) => l.code}
            columns={[
              { key: "c", header: "Lot", render: (l: any) => <LotLink code={l.code} /> },
              { key: "m", header: "Material", render: (l: any) => l.materialLabel },
              { key: "kg", header: "Weighed", num: true, render: (l: any) => kg(l.aggregatedKg) },
              { key: "r", header: "Recycler", render: (l: any) => (
                <select className="select" style={{ width: 200 }} value={receiver[l.code] ?? l.receiver ?? recyclers[0]?.code} onChange={(e) => setReceiver({ ...receiver, [l.code]: e.target.value })}>
                  {recyclers.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              ) },
              { key: "a", header: "", render: (l: any) => (
                <Button size="sm" loading={busy === l.code} onClick={() => run(l.code, `/api/lots/${l.code}/dispatch`, { receiver: receiver[l.code] ?? l.receiver ?? recyclers[0]?.code }, () => `${l.code} dispatched`)}>Dispatch</Button>
              ) },
            ]}
            rows={toDispatch}
          />
        </Card>
      )}
      <Card title="In custody, verification or review" flush>
        <Table
          empty="Nothing in progress."
          rowKey={(l: any) => l.code}
          onRow={(l: any) => navigate(`/lots/${l.code}`)}
          columns={[
            { key: "c", header: "Lot", render: (l: any) => <span className="mono">{l.code}</span> },
            { key: "m", header: "Material", render: (l: any) => l.materialLabel },
            { key: "r", header: "Recycler", render: (l: any) => dir.shortName(l.receiver) },
            { key: "kg", header: "Weighed", num: true, render: (l: any) => kg(l.aggregatedKg) },
            { key: "el", header: "Eligible", num: true, render: (l: any) => (l.eligibleKg ? kg(l.eligibleKg) : "—") },
            { key: "s", header: "State", render: (l: any) => <LotState state={l.state} /> },
          ]}
          rows={inFlight}
        />
      </Card>
    </div>
  );
}

function Sales({ lots }: { lots: any[] }) {
  const dir = useDirectory();
  return (
    <div className="stack">
      <Alert tone="info" title="Settled lots are offered on the open network">
        Recyclers discover them through a signed Beckn search and buy by delivery versus payment. The sponsor's funded-recovery claim stays with the sponsor; the buyer receives the material and an EPR-ready supply claim, disclosed alongside it. See the <Link to="/facility">recycler console</Link>.
      </Alert>
      <Card flush title="Available for purchase">
        <Table
          empty="No unsold settled lots."
          rowKey={(l: any) => l.code}
          onRow={(l: any) => navigate(`/lots/${l.code}`)}
          columns={[
            { key: "c", header: "Lot", render: (l: any) => <span className="mono">{l.code}</span> },
            { key: "m", header: "Material", render: (l: any) => l.materialLabel },
            { key: "kg", header: "Eligible", num: true, render: (l: any) => kg(l.eligibleKg) },
            { key: "p", header: "Indicative price", num: true, render: (l: any) => inr(l.eligibleKg * (dir.materials[l.material]?.pricePerKg ?? 0)) },
            { key: "r", header: "At", render: (l: any) => dir.shortName(l.receiver) },
          ]}
          rows={lots}
        />
      </Card>
    </div>
  );
}
