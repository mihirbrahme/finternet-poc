import { useState } from "react";
import { useApi } from "../lib/api";
import { dateTime, kg } from "../lib/format";
import { useDirectory } from "../lib/directory";
import { Badge, Card, ErrorNote, Loading, LotLink, PageHead, Table } from "../components/ui";
import { RecordDrawer } from "../components/RecordDrawer";

export default function Anomalies() {
  const { data, error } = useApi<any>("/api/anomalies");
  const dir = useDirectory();
  const [open, setOpen] = useState<{ record: string; lot?: string } | null>(null);
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!data) return <Loading />;
  return (
    <div className="page">
      <PageHead
        role="public"
        eyebrow="Anomaly register"
        title="Flags are raised before money moves"
        lead="The anomaly engine runs over every synced record. It flags; people decide. A flagged record travels with its lot, is always in the verifier's sampling plan, and can be excluded from payment without penalising other collectors."
      />
      <Card title="Flagged records" sub={`${data.records.length} records carry a medium or high flag`} flush>
        <Table
          empty="No flagged records in the network."
          rowKey={(r: any) => r.record}
          onRow={(r: any) => setOpen({ record: r.record, lot: r.lot })}
          columns={[
            { key: "r", header: "Record", render: (r: any) => <span className="mono small">{r.record}</span> },
            { key: "s", header: "Collector", render: (r: any) => <span className="mono">{r.saathi}</span> },
            { key: "v", header: "Village", render: (r: any) => dir.village(r.village) },
            { key: "at", header: "Captured", render: (r: any) => <span className="small">{dateTime(r.capturedAt)}</span> },
            { key: "kg", header: "Weight", num: true, render: (r: any) => kg(r.kg) },
            {
              key: "f",
              header: "Why it was flagged",
              render: (r: any) => (
                <div className="stack" style={{ gap: 6 }}>
                  {r.flags.map((f: any) => (
                    <div key={f.code} className="small">
                      <Badge tone={f.severity === "high" ? "danger" : "warning"}>{f.code.toLowerCase().replace(/_/g, " ")}</Badge> {f.explanation}
                    </div>
                  ))}
                </div>
              ),
            },
            { key: "lot", header: "Lot", render: (r: any) => (r.lot ? <LotLink code={r.lot} /> : <span className="small muted">Awaiting aggregation</span>) },
          ]}
          rows={data.records}
        />
      </Card>
      {data.lots.length > 0 && (
        <Card title="Lots carrying flags" flush>
          <Table
            rowKey={(l: any) => l.code}
            columns={[
              { key: "c", header: "Lot", render: (l: any) => <LotLink code={l.code} /> },
              { key: "f", header: "Flags", render: (l: any) => <span className="small">{l.flags.map((f: any) => f.explanation).join(" ")}</span> },
            ]}
            rows={data.lots}
          />
        </Card>
      )}
      <Card title="Rules" sub="Deterministic and explainable; thresholds are programme parameters" flush>
        <Table
          rowKey={(r: any) => r.code}
          columns={[
            { key: "c", header: "Flag", render: (r: any) => <span className="mono small">{r.code}</span> },
            { key: "r", header: "Rule", render: (r: any) => r.rule },
          ]}
          rows={data.rules}
        />
      </Card>
      {open && <RecordDrawer record={open.record} lot={open.lot} onClose={() => setOpen(null)} />}
    </div>
  );
}
