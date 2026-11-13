import { useState } from "react";
import { useApi } from "../lib/api";
import { date, inr, kg, month, monthShort } from "../lib/format";
import { navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Columns } from "../components/charts";
import { Alert, Button, Card, ErrorNote, Field, Loading, PageHead, Stat, Table, Tabs, useAction } from "../components/ui";

export default function Panchayat({ village }: { village: string }) {
  const dir = useDirectory();
  const { data: p, error } = useApi<any>(`/api/panchayat/${village}`);
  const { data: lots } = useApi<any[]>("/api/lots");
  const { run, busy } = useAction();
  const [view, setView] = useState("chart");
  const [cosign, setCosign] = useState({ subject: `collection-point:${village}-02`, note: "" });
  const [concern, setConcern] = useState({ lot: "", reason: "" });
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!p) return <Loading />;
  const materials = [...new Set(p.monthly.flatMap((m: any) => Object.keys(m).filter((k) => k !== "month")))] as string[];
  const totalOf = (m: any) => materials.reduce((s, k) => s + (m[k] ?? 0), 0);
  const inWindow = (lots ?? []).filter((l) => l.state === "VERIFIED" && l.villages.includes(village));
  const gp = p.panchayat.code;

  return (
    <div className="page">
      <PageHead
        role="panchayat"
        eyebrow="Gram Panchayat observer view"
        title={p.panchayat.name}
        lead={`What was recovered from ${p.village.name} (${p.village.taluka} taluka, ${p.village.households} households), who is collecting, what they were paid in aggregate, and any open concerns. No individual's data is shown.`}
        actions={
          <>
            <Field label="Village">
              <select className="select" value={village} onChange={(e) => navigate(`/panchayat/${e.target.value}`)}>
                {dir.villages.map((v) => <option key={v.code} value={v.code}>{v.name}</option>)}
              </select>
            </Field>
            <Button variant="secondary" onClick={() => window.print()}>Print for the Gram Sabha</Button>
          </>
        }
      />
      <Alert tone="info" title="मराठी आवृत्ती लवकरच · Marathi version coming soon">
        The Panchayat view is required in Marathi (GP-01). This sandbox shows it in English.
      </Alert>
      <div className="grid g4">
        <Stat value={kg(p.capturedKg, 0)} label="Recovered from the village" detail="Since May 2026" accent="var(--role-panchayat)" />
        <Stat value={p.activeCollectors} label="Active local collectors" accent="var(--role-panchayat)" />
        <Stat value={inr(p.incentivesPaidInr)} label="Incentives paid to them" detail="In aggregate, by UPI" accent="var(--role-panchayat)" />
        <Stat value={p.concerns.length} label="Concerns raised" detail={p.concerns.filter((c: any) => !c.resolution).length ? "Some open" : "All resolved"} accent="var(--role-panchayat)" />
      </div>
      <div className="grid g-wide">
        <Card title="Recovered by month" sub="Kilograms captured in the village, all materials" actions={<Tabs tabs={[{ id: "chart", label: "Chart" }, { id: "table", label: "By material" }]} value={view} onChange={setView} />}>
          {view === "chart" ? (
            <Columns label="Kilograms recovered by month" data={p.monthly.map((m: any) => ({ x: monthShort(m.month), y: totalOf(m), tip: <>{month(m.month)}: <b>{kg(totalOf(m), 0)}</b></> }))} format={(n) => kg(n, 0)} />
          ) : (
            <Table
              columns={[{ key: "m", header: "Month", render: (m: any) => month(m.month) }, ...materials.map((k) => ({ key: k, header: dir.material(k), num: true, render: (m: any) => (m[k] ? Math.round(m[k]).toLocaleString("en-IN") : "—") }))]}
              rows={p.monthly}
            />
          )}
        </Card>
        <Card title="Collection points">
          <Table columns={[{ key: "n", header: "Point", render: (c: any) => c.name }, { key: "l", header: "Location", render: (c: any) => <span className="mono small">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span> }]} rows={p.collectionPoints} />
        </Card>
      </div>
      <Card title="Concerns" sub="A concern from the Panchayat enters the challenge process and pauses settlement of that lot" flush>
        <Table
          empty="No concerns raised."
          columns={[
            { key: "lot", header: "Lot", render: (c: any) => <span className="mono">{c.lot}</span> },
            { key: "by", header: "Raised by", render: (c: any) => dir.name(c.by) },
            { key: "r", header: "Concern", render: (c: any) => <span className="small">{c.reason}</span> },
            { key: "at", header: "When", render: (c: any) => <span className="small">{date(c.at)}</span> },
            { key: "res", header: "Resolution", render: (c: any) => <span className="small">{c.resolution ?? "Open"}</span> },
          ]}
          rows={p.concerns}
        />
      </Card>
      <div className="grid g2">
        <Card title="Co-attest" sub="Collector onboarding and collection points need the Panchayat's signature (GP-02)">
          <div className="stack">
            <Field label="Subject"><input className="input mono" value={cosign.subject} onChange={(e) => setCosign({ ...cosign, subject: e.target.value })} /></Field>
            <Field label="Note"><textarea className="textarea" value={cosign.note} onChange={(e) => setCosign({ ...cosign, note: e.target.value })} placeholder="e.g. Approved by the Gram Sabha on 10 November" /></Field>
            <Button disabled={!cosign.note || !cosign.subject} loading={busy === "cosign"} onClick={() => run("cosign", `/api/panchayat/${gp}/cosign`, cosign, () => "Co-attestation recorded on the ledger")}>Sign as {p.panchayat.name}</Button>
          </div>
        </Card>
        <Card title="Raise a concern" sub="Only lots still inside their challenge window can be challenged">
          <div className="stack">
            <Field label="Lot">
              <select className="select" value={concern.lot} onChange={(e) => setConcern({ ...concern, lot: e.target.value })}>
                <option value="">{inWindow.length ? "Choose a lot from this village" : "No lot from this village is in its challenge window"}</option>
                {inWindow.map((l) => <option key={l.code} value={l.code}>{l.code} · {l.materialLabel} · {kg(l.eligibleKg)}</option>)}
              </select>
            </Field>
            <Field label="Concern"><textarea className="textarea" value={concern.reason} onChange={(e) => setConcern({ ...concern, reason: e.target.value })} /></Field>
            <Button variant="secondary" disabled={!concern.lot || !concern.reason} loading={busy === "concern"} onClick={() => run("concern", `/api/lots/${concern.lot}/challenge`, { actor: `${gp}:OBSERVER`, reason: concern.reason }, () => `Concern on ${concern.lot} recorded; settlement paused`)}>Raise concern</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
