import { useApi } from "../lib/api";
import { date, inr, kg, policyLabels } from "../lib/format";
import { navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Card, ErrorNote, Loading, PageHead, ProgrammeStatus, Progress, Table } from "../components/ui";

export default function Programmes() {
  const { data, error } = useApi<any[]>("/api/programmes");
  const dir = useDirectory();
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!data) return <Loading />;
  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow="Programmes"
        title="Funded recovery programmes"
        lead="A programme is a signed agreement held in escrow: who collects what, where, at what rate, verified by whom. Money moves only when a verifier accepts a lot and its challenge window closes."
      />
      <Card flush>
        <Table
          onRow={(p: any) => navigate(`/programmes/${p.code}`)}
          rowKey={(p: any) => p.code}
          columns={[
            { key: "title", header: "Programme", render: (p: any) => (<div><div className="strong">{p.title}</div><div className="small muted mono">{p.code}</div></div>) },
            { key: "org", header: "Originator", render: (p: any) => p.originatorName },
            { key: "sp", header: "Sponsors", render: (p: any) => p.sponsors.map((s: any) => dir.shortName(s.code)).join(", ") },
            { key: "ver", header: "Verifier", render: (p: any) => dir.shortName(p.verifier) },
            { key: "policy", header: "Policy", render: (p: any) => <span className="small">{policyLabels[p.policy]}</span> },
            { key: "prog", header: "Verified vs target", width: 190, render: (p: any) => (<div className="stack" style={{ gap: 4 }}><Progress value={p.acceptedKg} max={p.targetKg} /><span className="small mono muted">{kg(p.acceptedKg, 0)} / {kg(p.targetKg, 0)}</span></div>) },
            { key: "funded", header: "Funded", num: true, render: (p: any) => inr(p.fundedInr) },
            { key: "paid", header: "Released", num: true, render: (p: any) => inr(p.paidInr) },
            { key: "deadline", header: "Deadline", render: (p: any) => <span className="small">{date(p.deadline)}</span> },
            { key: "status", header: "Status", render: (p: any) => <ProgrammeStatus status={p.status} /> },
          ]}
          rows={data}
        />
      </Card>
    </div>
  );
}
