import { useState } from "react";
import { useApi } from "../lib/api";
import { dateTime, num } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Card, ErrorNote, Hash, KV, Loading, PageHead, Simulated, Table, Tabs } from "../components/ui";
import { BecknMessages } from "../components/BecknMessages";

/** Plain-language explanation beside each technical record (NX-04). */
const explain: Record<string, string> = {
  RecoveryLotRegistry: "Each recovery lot is a token measured in grams. It cannot be traded freely: it moves only through custody, verification and settlement steps that the responsible parties sign.",
  VartulClaims: "Claims are the rights to say something about a lot: that you funded its recovery, or that you hold EPR-ready supply. They are exclusive and cannot be transferred, so the same kilogram is never claimed twice.",
  SandboxINR: "Sandbox money. In production this would be a regulated deposit token or a bank-backed settlement rail; here it lets settlement be atomic.",
  ProgrammeEscrow: "Holds sponsor funds under signed terms and releases them only for verified outcomes after the challenge window, or by an exception every party approves.",
  VartulAttestations: "Signed statements by the party responsible for each step: weighing, dispatch, receipt, verification, processing. Revoking one cascades to everything that depends on it.",
  VartulRegistry: "Who is on the network and in which role, backed by verifiable participant credentials.",
  PayoutRouter: "Splits the collectors' share of each settlement pro rata to their verified grams, skipping excluded grams.",
  MaterialSettlement: "Delivery versus payment: the recycler's payment and the material entitlement move in one transaction or not at all.",
};

export default function Explorer({ tx }: { tx?: string }) {
  const { data: m, error } = useApi<any>("/api/ledger/managers");
  const { data: txs } = useApi<any[]>("/api/ledger/transactions?limit=150");
  const { data: beckn } = useApi<any[]>("/api/beckn/log");
  const [tab, setTab] = useState("tx");
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!m) return <Loading />;
  if (tx) return <TxDetail hash={tx} />;
  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow="Ledger explorer · the Finternet view"
        title="Token managers, transactions and network messages"
        lead="Assets with proof chains, programmable settlement and an open network, all inspectable. Every number elsewhere in Vartul is derived from the events listed here."
      />
      <Alert tone="sim" title={m.chain.name}>
        {m.chain.publicEndState} Chain ID {m.chain.id}.
      </Alert>
      <div className="grid g4">
        {m.managers.map((x: any) => (
          <div key={x.contract} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="eyebrow">{x.standard}</div>
            <div className="strong" style={{ fontSize: 16 }}>{x.name}</div>
            <div className="stat-value" style={{ fontSize: 24 }}>
              {typeof x.supply === "number" ? num(x.supply, x.unit === "kg" ? 0 : 0) : x.supply} <span className="small muted">{x.unit}</span>
            </div>
            {x.states && (
              <div className="row" style={{ gap: 4 }}>
                {Object.entries(x.states).map(([k, v]) => <Badge key={k}>{k.toLowerCase().replace(/_/g, " ")} {String(v)}</Badge>)}
              </div>
            )}
            <p className="small muted">{explain[x.contract]}</p>
            <Hash value={x.address} />
          </div>
        ))}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "tx", label: "Transactions", count: txs?.length }, { id: "beckn", label: "Network messages", count: beckn?.length }]} />
      {tab === "tx" && (
        <Card flush>
          {!txs ? <Loading /> : (
            <Table
              rowKey={(t: any) => t.hash}
              onRow={(t: any) => navigate(`/network/explorer/tx/${t.hash}`)}
              columns={[
                { key: "b", header: "Block", num: true, render: (t: any) => t.block },
                { key: "at", header: "When", render: (t: any) => <span className="small">{dateTime(t.at)}</span> },
                { key: "a", header: "Action", render: (t: any) => t.action },
                { key: "by", header: "Signed by", render: (t: any) => <span className="small">{t.actorLabel ?? t.actor}</span> },
                { key: "e", header: "Events", render: (t: any) => <span className="small muted">{t.events.length} · {[...new Set(t.events)].slice(0, 3).join(", ")}</span> },
                { key: "h", header: "Hash", render: (t: any) => <Hash value={t.hash} /> },
              ]}
              rows={txs}
            />
          )}
        </Card>
      )}
      {tab === "beckn" && (beckn?.length ? <BecknMessages messages={beckn.slice().reverse()} title="Beckn message log" /> : <Card><div className="empty">No network messages in this snapshot yet. Run scene 2 or scene 8, or search from the sponsor portal.</div></Card>)}
    </div>
  );
}

function TxDetail({ hash }: { hash: string }) {
  const { data: t, error } = useApi<any>(`/api/ledger/transactions/${hash}`);
  const dir = useDirectory();
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!t) return <Loading />;
  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow={<><Link to="/network/explorer">Ledger explorer</Link> / transaction</>}
        title={t.action}
        lead={`Block ${t.block} · ${dateTime(t.at)} · signed by ${dir.name(t.participant)} (${t.actor})`}
      />
      <Card title="Transaction">
        <KV
          items={[
            ["Hash", <Hash value={t.hash} n={14} />],
            ["Block", t.block],
            ["Time", dateTime(t.at)],
            ["Signer", `${dir.name(t.participant)} · ${t.actor}`],
            ["Subject", t.subject ? (t.subject.startsWith("VRL-") ? <Link to={`/lots/${t.subject}`} className="mono">{t.subject}</Link> : t.subject.startsWith("PRG-") ? <Link to={`/programmes/${t.subject}`} className="mono">{t.subject}</Link> : t.subject) : "—"],
            ["Scene", t.scene ? <Simulated>{`Demonstration ${t.scene}`}</Simulated> : "Seeded history"],
          ]}
        />
      </Card>
      <Card title={`${t.events.length} decoded events`} sub="Emitted by the token managers in the order they executed; all succeed or none do" flush>
        <Table
          rowKey={(e: any) => String(e.logIndex)}
          columns={[
            { key: "i", header: "#", num: true, render: (e: any) => e.logIndex },
            { key: "c", header: "Contract", render: (e: any) => <span className="small">{e.contract}</span> },
            { key: "e", header: "Event", render: (e: any) => <span className="mono">{e.event}</span> },
            {
              key: "a",
              header: "Arguments",
              render: (e: any) => (
                <div className="small mono" style={{ display: "grid", gridTemplateColumns: "max-content minmax(0,1fr)", gap: "2px 10px" }}>
                  {Object.entries(e.args).map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <span className="muted">{k}</span>
                      <span style={{ overflowWrap: "anywhere" }}>{fmtArg(k, v)}</span>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
          rows={t.events}
        />
      </Card>
    </div>
  );
}

const fmtArg = (k: string, v: unknown) => {
  const s = Array.isArray(v) ? v.join(", ") : String(v);
  if (/amount|value|price|refund/i.test(k) && /^\d{16,}$/.test(s)) return `₹${(Number(BigInt(s) / 10n ** 14n) / 10_000).toLocaleString("en-IN")}`;
  if (/grams/i.test(k) && /^\d+$/.test(s)) return `${(Number(s) / 1000).toLocaleString("en-IN")} kg`;
  return s.length > 46 ? `${s.slice(0, 22)}…${s.slice(-12)}` : s;
};
