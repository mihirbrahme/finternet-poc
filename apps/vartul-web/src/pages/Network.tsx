import { useApi } from "../lib/api";
import { inr, inrShort, kg, monthShort, num, pct, policyLabels, month } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Columns, RankBars, SplitBar } from "../components/charts";
import { Alert, Badge, Card, ErrorNote, Loading, PageHead, ProgrammeStatus, Progress, Stat, Table, Tabs, roleColour } from "../components/ui";
import { useState } from "react";

export default function Network() {
  const { data, error } = useApi<any>("/api/overview");
  const dir = useDirectory();
  const [view, setView] = useState<"chart" | "table">("chart");
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!data) return <Loading />;
  const t = data.totals;

  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow="Raigad coast · six months of recovery"
        title="Every kilogram here is verified, and every rupee is traced"
        lead="Recovered waste from the Murud, Alibag and Shrivardhan coasts becomes ledger-backed recovery lots. Sponsors fund outcomes, collectors are paid on verification, and anyone can check a claim."
      />

      <div className="grid g4">
        <Stat value={kg(t.verifiedKg, 0)} label="Verified recovery" detail={`${num(t.lots)} lots · ${num(t.settledLots)} settled`} />
        <Stat value={inrShort(t.releasedInr)} label="Released from escrow" detail={`of ${inrShort(t.fundedInr)} committed by sponsors`} />
        <Stat value={pct(t.lastMileShare, 0)} label="Reached collectors" detail={`${inr(t.collectorPaidInr)} paid to ${t.saathisPaid} safai saathis`} accent="var(--role-originator)" />
        <Stat value={num(t.overClaimedLots)} label="Over-claimed lots" detail={`${num(t.claims)} exclusive claims · ${num(t.contestedClaims)} contested`} accent={t.overClaimedLots ? "var(--status-danger)" : "var(--status-success)"} />
      </div>

      <div className="grid g-wide">
        <Card
          title="Verified recovery by month"
          sub="Kilograms accepted by an accredited verifier, by month of collection window"
          actions={<Tabs tabs={[{ id: "chart", label: "Chart" }, { id: "table", label: "Table" }]} value={view} onChange={(v) => setView(v as any)} />}
        >
          {view === "chart" ? (
            <Columns
              label="Verified kilograms by month"
              highlight={Math.max(0, data.monthly.length - 2)}
              data={data.monthly.map((m: any) => ({ x: monthShort(m.month), y: m.kg, tip: <>{month(m.month)}: <b>{kg(m.kg, 0)}</b> · collectors paid <b>{inr(m.collectorInr)}</b></> }))}
              format={(n) => `${num(n / 1000, 1)} t`}
            />
          ) : (
            <Table
              columns={[
                { key: "month", header: "Month", render: (m: any) => month(m.month) },
                { key: "kg", header: "Verified", num: true, render: (m: any) => kg(m.kg, 0) },
                { key: "c", header: "Paid to collectors", num: true, render: (m: any) => inr(m.collectorInr) },
              ]}
              rows={data.monthly}
            />
          )}
          <p className="small muted" style={{ marginTop: 12 }}>
            October, the last complete month, is highlighted; November is month to date. Source: ledger events, re-indexed on every load.
          </p>
        </Card>
        <Card title="What was recovered" sub="Verified kilograms by material">
          <RankBars data={data.materials.map((m: any) => ({ label: m.label, value: m.kg }))} format={(n) => kg(n, 0)} />
        </Card>
      </div>

      <Card title="Where the released money went" sub="Settlement splits are fixed in each programme's signed terms and executed by the escrow contract">
        <SplitBar
          format={inrShort}
          parts={[
            { label: "Collectors (safai saathis)", value: data.split.collectorsInr, colour: "var(--suma-teal-600)" },
            { label: "Originators (operations, MRC, logistics)", value: data.split.originatorsInr, colour: "var(--neutral-300)" },
            { label: "Verifiers", value: data.split.verifiersInr, colour: "var(--accent-amber)" },
          ]}
        />
      </Card>

      <Card title="Funded programmes" sub="Each programme is an escrow on the ledger with its own payment policy" flush>
        <Table
          onRow={(p: any) => navigate(`/programmes/${p.code}`)}
          rowKey={(p: any) => p.code}
          columns={[
            { key: "title", header: "Programme", render: (p: any) => (<div><div className="strong">{p.title}</div><div className="small muted">{p.originatorName} · {p.region}</div></div>) },
            { key: "sp", header: "Sponsors", render: (p: any) => p.sponsors.map((s: any) => dir.shortName(s.code)).join(", ") },
            { key: "policy", header: "Policy", render: (p: any) => <span className="small">{policyLabels[p.policy]}{p.policy === "PER_KG_CAPPED" ? ` · ₹${p.ratePerKg}/kg` : ""}</span> },
            { key: "progress", header: "Verified vs target", width: 200, render: (p: any) => (<div className="stack" style={{ gap: 4 }}><Progress value={p.acceptedKg} max={p.targetKg} /><span className="small mono muted">{kg(p.acceptedKg, 0)} / {kg(p.targetKg, 0)}</span></div>) },
            { key: "paid", header: "Released", num: true, render: (p: any) => inr(p.paidInr) },
            { key: "status", header: "Status", render: (p: any) => <ProgrammeStatus status={p.status} /> },
          ]}
          rows={data.programmes}
        />
      </Card>

      <div className="grid g2">
        <Card title="Participants" sub="Registered on the network with role credentials" flush>
          <Table
            onRow={(o: any) => navigate(`/participants/${o.code}`)}
            rowKey={(o: any) => o.code}
            columns={[
              { key: "name", header: "Organisation", render: (o: any) => (<span className="row" style={{ gap: 8 }}><span className="nav-dot" style={{ background: roleColour[o.kind] ?? roleColour.public }} />{o.name}</span>) },
              { key: "kind", header: "Role", render: (o: any) => <span className="small" style={{ textTransform: "capitalize" }}>{o.kind}</span> },
              { key: "real", header: "", render: (o: any) => (o.real ? <Badge tone="brand">Real organisation</Badge> : <Badge>Fictional</Badge>) },
            ]}
            rows={data.organisations}
          />
        </Card>
        <div className="stack">
          <Alert tone="sim" title="What is simulated in this sandbox">
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {Object.values(data.simulated as Record<string, string>).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Alert>
          <Card title="Check any claim yourself">
            <p className="small" style={{ marginBottom: 12 }}>
              Every certificate carries a QR code. The public verifier checks the issuer's signature, the revocation list and the live claim on the ledger, with no account needed.
            </p>
            <Link to="/verify">Open the public verifier</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
