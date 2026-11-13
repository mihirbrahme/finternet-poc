import { useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { date, kg, lotStates } from "../lib/format";
import { navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Badge, Card, ErrorNote, Loading, LotState, PageHead, Table } from "../components/ui";

export default function Lots() {
  const { data, error } = useApi<any[]>("/api/lots");
  const dir = useDirectory();
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [programme, setProgramme] = useState("");
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (l) =>
          (!q || l.code.toLowerCase().includes(q.toLowerCase()) || l.materialLabel.toLowerCase().includes(q.toLowerCase())) &&
          (!state || l.state === state) &&
          (!programme || l.programme === programme),
      ),
    [data, q, state, programme],
  );
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!data) return <Loading />;
  const programmes = [...new Set(data.map((l) => l.programme))];
  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow="Recovery lots"
        title="Every lot carries its own proof chain"
        lead="A recovery lot is a weighed bale of one material, minted on the ledger with a Merkle root over every signed collection record in it. Its state moves only when the responsible party attests."
      />
      <div className="row">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search by lot code or material" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search lots" />
        <select className="select" style={{ maxWidth: 240 }} value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
          <option value="">All states</option>
          {Object.entries(lotStates).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select className="select" style={{ maxWidth: 260 }} value={programme} onChange={(e) => setProgramme(e.target.value)} aria-label="Filter by programme">
          <option value="">All programmes</option>
          {programmes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="muted small">{rows.length} of {data.length} lots</span>
      </div>
      <Card flush>
        <Table
          onRow={(l: any) => navigate(`/lots/${l.code}`)}
          rowKey={(l: any) => l.code}
          columns={[
            { key: "code", header: "Lot", render: (l: any) => <span className="mono">{l.code}</span> },
            { key: "mat", header: "Material", render: (l: any) => l.materialLabel },
            { key: "org", header: "Originator", render: (l: any) => dir.shortName(l.originator) },
            { key: "v", header: "From", render: (l: any) => <span className="small">{[...new Set(l.villages as string[])].slice(0, 3).map((v) => dir.village(v)).join(", ")}</span> },
            { key: "minted", header: "Minted", render: (l: any) => <span className="small">{date(l.mintedAt)}</span> },
            { key: "agg", header: "Weighed", num: true, render: (l: any) => kg(l.aggregatedKg) },
            { key: "el", header: "Eligible", num: true, render: (l: any) => (l.eligibleKg ? kg(l.eligibleKg) : "—") },
            { key: "flags", header: "", render: (l: any) => (l.flags ? <Badge tone="warning">{l.flags} flag{l.flags > 1 ? "s" : ""}</Badge> : l.sold ? <Badge tone="brand">Sold</Badge> : null) },
            { key: "state", header: "State", render: (l: any) => <LotState state={l.state} /> },
          ]}
          rows={rows.slice(0, 400)}
        />
      </Card>
    </div>
  );
}
