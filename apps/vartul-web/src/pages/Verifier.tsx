import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { dateTime, duration, kg } from "../lib/format";
import { navigate, setQuery, useLocation } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, ErrorNote, Field, Loading, LotLink, LotState, PageHead, Stat, Table, Tabs, useAction } from "../components/ui";
import { RecordDrawer } from "../components/RecordDrawer";

const VERIFIERS = ["NIRIKSHAN", "DRISHTI"];

export default function Verifier() {
  const { query } = useLocation();
  const as = VERIFIERS.includes(query.get("as") ?? "") ? query.get("as")! : "NIRIKSHAN";
  const dir = useDirectory();
  const { data: q, error } = useApi<any>(`/api/verifier/${as}/queue`);
  const { data: clock } = useApi<{ now: number }>("/api/clock");
  const [tab, setTab] = useState("awaiting");
  const [selected, setSelected] = useState<string | null>(query.get("lot"));
  useEffect(() => {
    if (!selected && q?.awaiting?.length) setSelected(q.awaiting[0].code);
  }, [q, selected]);
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!q) return <Loading />;
  const now = clock?.now ?? 0;
  const rows = tab === "awaiting" ? q.awaiting : tab === "window" ? q.inWindow : q.recent;

  return (
    <div className="page">
      <PageHead
        role="verifier"
        eyebrow="Verifier console"
        title={dir.name(as)}
        lead="Independent verification of received lots: a risk-weighted sampling plan, every flagged record, the recycler's weighbridge reading, and a signed decision on the eligible quantity."
        actions={
          <Field label="Acting as">
            <select className="select" value={as} onChange={(e) => { setSelected(null); setQuery("as", e.target.value); }}>
              {VERIFIERS.map((v) => <option key={v} value={v}>{dir.name(v)}</option>)}
            </select>
          </Field>
        }
      />
      <div className="grid g3">
        <Stat value={q.awaiting.length} label="Received lots awaiting decision" detail="Service level: 5 working days" accent="var(--role-verifier)" />
        <Stat value={q.inWindow.length} label="Verified, challenge window open" detail="Anyone with standing may challenge" accent="var(--role-verifier)" />
        <Stat value={q.recent.length} label="Recently settled" accent="var(--role-verifier)" />
      </div>
      <div className="grid g-wide" style={{ alignItems: "start" }}>
        <Card flush>
          <div style={{ padding: "0 20px" }}>
            <Tabs value={tab} onChange={setTab} tabs={[{ id: "awaiting", label: "Awaiting decision", count: q.awaiting.length }, { id: "window", label: "In challenge window", count: q.inWindow.length }, { id: "recent", label: "Settled", count: q.recent.length }]} />
          </div>
          <Table
            empty="No lots in this list."
            rowKey={(l: any) => l.code}
            selected={(l: any) => l.code === selected}
            onRow={(l: any) => setSelected(l.code)}
            columns={[
              { key: "c", header: "Lot", render: (l: any) => <span className="mono">{l.code}</span> },
              { key: "m", header: "Material", render: (l: any) => l.materialLabel },
              { key: "kg", header: "Received", num: true, render: (l: any) => kg(l.receivedKg) },
              { key: "f", header: "", render: (l: any) => (l.flags ? <Badge tone="warning">{l.flags} flag{l.flags > 1 ? "s" : ""}</Badge> : null) },
              { key: "s", header: tab === "window" ? "Window closes" : "State", render: (l: any) => (tab === "window" ? <span className="small">{duration(l.challengeDeadline - now)}</span> : <LotState state={l.state} />) },
            ]}
            rows={rows}
          />
        </Card>
        {selected ? <Decision code={selected} verifier={as} /> : <Card><div className="empty">Select a lot to review its proof chain.</div></Card>}
      </div>
    </div>
  );
}

function Decision({ code, verifier }: { code: string; verifier: string }) {
  const { data: l } = useApi<any>(`/api/lots/${code}`);
  const dir = useDirectory();
  const { run, busy } = useAction();
  const [record, setRecord] = useState<string | null>(null);
  const flaggedBySaathi = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of l?.records ?? []) if (r.flags.some((f: string) => f !== "ODD_HOURS")) m.set(r.saathi, (m.get(r.saathi) ?? 0) + r.kg);
    return m;
  }, [l]);
  const [excl, setExcl] = useState<{ saathi: string; kg: string; reason: string }[]>([]);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setExcl([...flaggedBySaathi].map(([saathi, k]) => ({ saathi, kg: k.toFixed(1), reason: "Flagged records excluded: weight outlier, duplicate photo or off-route location" })));
    setNotes("");
  }, [flaggedBySaathi]);
  if (!l) return <Card><Loading /></Card>;
  const excludedKg = excl.reduce((s, e) => s + (Number(e.kg) || 0), 0);
  const eligible = Math.max(0, (l.receivedKg ?? 0) - excludedKg);
  const canDecide = l.state === "RECEIVED" && l.verifier === verifier;

  return (
    <div className="stack">
      <Card title={<span className="mono">{l.code}</span>} sub={`${l.materialLabel} · ${dir.name(l.originator)} → ${dir.name(l.receiver)}`} actions={<Button size="sm" variant="ghost" onClick={() => navigate(`/lots/${l.code}`)}>Full proof chain</Button>}>
        <div className="stack">
          <Table
            columns={[{ key: "k", header: "Check", render: (r: any) => r[0] }, { key: "v", header: "Result", render: (r: any) => r[1] }]}
            rows={[
              ["Merkle root vs ledger", l.proofRootMatches ? <Badge tone="success" dot>Matches</Badge> : <Badge tone="danger" dot>Mismatch</Badge>],
              ["Mass balance at MRC", <span className="small mono">{kg(l.massBalance.aggregatedKg, 1)} weighed / {kg(l.massBalance.netKg, 1)} net</span>],
              ["Recycler weighbridge", <span className="small mono">{kg(l.receivedKg, 1)} ({(((l.aggregatedKg - l.receivedKg) / l.aggregatedKg) * 100).toFixed(1)}% variance)</span>],
              ["Device signatures", <span className="small">{l.records.filter((r: any) => r.deviceSigned).length} of {l.records.length} valid</span>],
              ["Anomaly flags", l.lotFlags.length ? <Badge tone="warning">{l.lotFlags.map((f: any) => f.code.toLowerCase().replace(/_/g, " ")).join(", ")}</Badge> : <Badge tone="success">None</Badge>],
            ]}
          />
        </div>
      </Card>
      <Card title="Sampling plan" sub="Every flagged record, plus a deterministic random sample" flush>
        <Table
          rowKey={(p: any) => p.record}
          onRow={(p: any) => setRecord(p.record)}
          columns={[
            { key: "r", header: "Record", render: (p: any) => <span className="mono small">{p.record}</span> },
            { key: "s", header: "Collector", render: (p: any) => <span className="mono small">{l.records.find((r: any) => r.id === p.record)?.saathi}</span> },
            { key: "kg", header: "Weight", num: true, render: (p: any) => kg(l.records.find((r: any) => r.id === p.record)?.kg) },
            { key: "why", header: "Why sampled", render: (p: any) => (p.reason === "Random sample" ? <span className="small muted">Random sample</span> : <Badge tone="warning">{p.reason.toLowerCase().replace(/_/g, " ")}</Badge>) },
          ]}
          rows={l.samplingPlan}
        />
      </Card>
      {canDecide ? (
        <Card title="Decision" sub="Eligible quantity can never exceed the recycler's received weight">
          <div className="stack">
            {excl.map((e, i) => (
              <div key={i} className="grid" style={{ gridTemplateColumns: "150px 100px minmax(0,1fr) auto", gap: 8, alignItems: "end" }}>
                <Field label="Collector">
                  <select className="select" value={e.saathi} onChange={(ev) => setExcl(excl.map((x, j) => (j === i ? { ...x, saathi: ev.target.value } : x)))}>
                    {[...new Set(l.records.map((r: any) => r.saathi as string))].map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                  </select>
                </Field>
                <Field label="Exclude (kg)"><input className="input mono" value={e.kg} onChange={(ev) => setExcl(excl.map((x, j) => (j === i ? { ...x, kg: ev.target.value } : x)))} /></Field>
                <Field label="Reason"><input className="input" value={e.reason} onChange={(ev) => setExcl(excl.map((x, j) => (j === i ? { ...x, reason: ev.target.value } : x)))} /></Field>
                <Button variant="ghost" size="sm" onClick={() => setExcl(excl.filter((_, j) => j !== i))} aria-label="Remove exclusion">×</Button>
              </div>
            ))}
            <div><Button variant="secondary" size="sm" onClick={() => setExcl([...excl, { saathi: l.records[0]?.saathi, kg: "", reason: "" }])}>Add an exclusion</Button></div>
            <Field label="Notes"><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was sampled and found" /></Field>
            <Alert tone="info" title={`Eligible: ${kg(eligible, 1)} of ${kg(l.receivedKg, 1)} received`}>
              Signing opens a {72}-hour challenge window. Excluded grams are not paid; other collectors are paid normally.
            </Alert>
            <div className="row">
              <Button loading={busy === "verify"} onClick={() => run("verify", `/api/lots/${l.code}/verify`, { eligibleKg: Number(eligible.toFixed(3)), excluded: excl.filter((e) => Number(e.kg) > 0).map((e) => ({ saathi: e.saathi, kg: Number(e.kg), reason: e.reason })), notes: notes || `${l.samplingPlan.length} records sampled against the MRC log and weighbridge slip.` }, () => `${l.code} verified: ${kg(eligible, 1)} eligible`)}>
                Sign verification
              </Button>
              <Button variant="danger" loading={busy === "reject"} onClick={() => run("reject", `/api/lots/${l.code}/verify`, { eligibleKg: 0, excluded: [], notes: notes || "Rejected: proof chain insufficient" }, () => `${l.code} rejected`)}>
                Reject the lot
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        l.verification && (
          <Alert tone="success" title={`Decided: ${kg(l.eligibleKg, 1)} eligible`}>
            {l.verification.notes} {l.challengeDeadline ? `Challenge window closes ${dateTime(l.challengeDeadline)}.` : ""}
          </Alert>
        )
      )}
      {record && <RecordDrawer lot={l.code} record={record} onClose={() => setRecord(null)} />}
    </div>
  );
}
