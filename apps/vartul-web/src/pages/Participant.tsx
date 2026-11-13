import { useApi } from "../lib/api";
import { inr, kg } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { Badge, Card, ErrorNote, Hash, KV, Loading, PageHead, ProgrammeStatus, Stat, Table } from "../components/ui";

const consoleFor: Record<string, (code: string) => string> = {
  sponsor: (c) => `/sponsor?as=${c}`,
  ngo: (c) => `/originator?as=${c}`,
  recycler: (c) => `/facility?as=${c}`,
  verifier: (c) => `/verifier?as=${c}`,
  panchayat: (c) => `/panchayat/${c.replace("GP-", "")}`,
};

export default function Participant({ code }: { code: string }) {
  const { data: p, error } = useApi<any>(`/api/participants/${code}`);
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!p) return <Loading />;
  const console = consoleFor[p.kind]?.(p.code);
  return (
    <div className="page">
      <PageHead
        role={p.kind}
        eyebrow={<>{p.kind} · {p.place} {p.real ? <Badge tone="brand">Real organisation</Badge> : <Badge>Fictional</Badge>}</>}
        title={p.name}
        actions={console && <Link to={console}>Open their console</Link>}
      />
      <div className="grid g3">
        <Stat value={inr(p.balanceInr)} label="Sandbox money held" />
        <Stat value={p.programmes.length} label="Programmes" />
        <Stat value={kg(p.claimSummary.fundedRecoveryKg + p.claimSummary.eprSupplyKg, 0)} label="Claims held" />
      </div>
      <div className="grid g2">
        <Card title="Registration">
          <KV
            items={[
              ...Object.entries(p.registrations ?? {}).map(([k, v]) => [k.toUpperCase(), String(v)] as [string, string]),
              ["Participant credential", <Link to={`/verify/${p.credential}`} className="mono">{p.credential}</Link>],
            ]}
          />
        </Card>
        <Card title="Ledger accounts" flush>
          <Table
            rowKey={(a: any) => a.key}
            columns={[
              { key: "l", header: "Account", render: (a: any) => a.label },
              { key: "r", header: "Roles", render: (a: any) => <span className="small">{a.roles.join(", ").toLowerCase()}</span> },
              { key: "a", header: "Address", render: (a: any) => <Hash value={a.address} /> },
              { key: "b", header: "Balance", num: true, render: (a: any) => inr(a.balanceInr) },
            ]}
            rows={p.accounts}
          />
        </Card>
      </div>
      {p.programmes.length > 0 && (
        <Card title="Programmes" flush>
          <Table
            rowKey={(x: any) => x.code}
            onRow={(x: any) => navigate(`/programmes/${x.code}`)}
            columns={[
              { key: "t", header: "Programme", render: (x: any) => x.title },
              { key: "k", header: "Verified", num: true, render: (x: any) => kg(x.acceptedKg, 0) },
              { key: "p", header: "Released", num: true, render: (x: any) => inr(x.paidInr) },
              { key: "s", header: "Status", render: (x: any) => <ProgrammeStatus status={x.status} /> },
            ]}
            rows={p.programmes}
          />
        </Card>
      )}
    </div>
  );
}
