import { useState } from "react";
import { dateTime } from "../lib/format";
import { Badge, Card, Table } from "./ui";

/** Signed Beckn messages for one or more transactions, with the raw envelope on demand. */
export function BecknMessages({ messages, title = "Signed network messages" }: { messages: any[]; title?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = open ? messages.find((m) => m.id === open) : null;
  return (
    <Card title={title} sub="Every request and callback is signed with Ed25519 over a BLAKE-512 digest and verified against the network registry" flush>
      <Table
        rowKey={(m: any) => m.id}
        onRow={(m: any) => setOpen(open === m.id ? null : m.id)}
        selected={(m: any) => m.id === open}
        columns={[
          { key: "at", header: "When", render: (m: any) => <span className="small">{dateTime(m.at)}</span> },
          { key: "a", header: "Action", render: (m: any) => <span className="mono">{m.action}</span> },
          { key: "d", header: "Direction", render: (m: any) => <span className="small">{m.from} → {m.to}</span> },
          { key: "dom", header: "Domain", render: (m: any) => <span className="small muted">{m.domain}</span> },
          { key: "sig", header: "Signature", render: (m: any) => (m.signatureValid ? <Badge tone="success" dot>Verified</Badge> : <Badge tone="danger" dot>Invalid</Badge>) },
        ]}
        rows={messages}
      />
      {shown && (
        <div style={{ padding: 16, borderTop: "1px solid var(--border-subtle)" }} className="stack">
          <div className="small"><span className="muted">Authorization </span><span className="mono">{shown.authorization}</span></div>
          <div className="small"><span className="muted">Digest </span><span className="mono">{shown.digest}</span></div>
          <pre className="code">{JSON.stringify(shown.body, null, 2)}</pre>
        </div>
      )}
    </Card>
  );
}
