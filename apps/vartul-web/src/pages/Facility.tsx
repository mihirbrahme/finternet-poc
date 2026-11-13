import { useState } from "react";
import { bump, post, useApi } from "../lib/api";
import { inr, kg } from "../lib/format";
import { navigate, setQuery, useLocation } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, ErrorNote, Field, Loading, LotLink, LotState, PageHead, Stat, Table, Tabs, useAction, useToast } from "../components/ui";
import { BecknMessages } from "../components/BecknMessages";

const FACILITIES = ["TALVAN", "GHATMATHA"];
const MATERIALS = ["LDPE", "PET", "HDPE", "MLP", "NETS", "GLASS"];

export default function Facility() {
  const { query } = useLocation();
  const as = FACILITIES.includes(query.get("as") ?? "") ? query.get("as")! : "TALVAN";
  const dir = useDirectory();
  const { data: f, error } = useApi<any>(`/api/facility/${as}`);
  const [tab, setTab] = useState(query.get("tab") ?? "buy");
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!f) return <Loading />;
  return (
    <div className="page">
      <PageHead
        role="facility"
        eyebrow="Recycler console"
        title={dir.name(as)}
        lead="Confirm what arrives on your weighbridge, buy verified lots on the open network by delivery versus payment, and keep supply provenance for your EPR records."
        actions={
          <Field label="Acting as">
            <select className="select" value={as} onChange={(e) => setQuery("as", e.target.value)}>
              {FACILITIES.map((x) => <option key={x} value={x}>{dir.name(x)}</option>)}
            </select>
          </Field>
        }
      />
      <div className="grid g4">
        <Stat value={f.inbound.length} label="Inbound lots" detail="Awaiting weighbridge receipt" accent="var(--role-facility)" />
        <Stat value={f.received.length} label="Received, in verification" accent="var(--role-facility)" />
        <Stat value={f.purchased.length} label="Lots purchased" detail={inr(f.purchased.reduce((s: number, p: any) => s + p.priceInr, 0))} accent="var(--role-facility)" />
        <Stat value={f.available.length} label="Settled lots at your site" detail="Available to buy" accent="var(--role-facility)" />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "buy", label: "Buy on the network" },
          { id: "inbound", label: "Inbound", count: f.inbound.length },
          { id: "purchased", label: "Purchased and provenance", count: f.purchased.length },
          { id: "received", label: "Received", count: f.received.length },
        ]}
      />
      {tab === "buy" && <Buy buyer={as} />}
      {tab === "inbound" && <Inbound lots={f.inbound} />}
      {tab === "purchased" && <Purchased rows={f.purchased} />}
      {tab === "received" && (
        <Card flush>
          <Table
            rowKey={(l: any) => l.code}
            onRow={(l: any) => navigate(`/lots/${l.code}`)}
            columns={[
              { key: "c", header: "Lot", render: (l: any) => <span className="mono">{l.code}</span> },
              { key: "m", header: "Material", render: (l: any) => l.materialLabel },
              { key: "o", header: "From", render: (l: any) => dir.shortName(l.originator) },
              { key: "r", header: "Your weighbridge", num: true, render: (l: any) => kg(l.receivedKg) },
              { key: "s", header: "State", render: (l: any) => <LotState state={l.state} /> },
            ]}
            rows={f.received}
          />
        </Card>
      )}
    </div>
  );
}

function Buy({ buyer }: { buyer: string }) {
  const dir = useDirectory();
  const toast = useToast();
  const [material, setMaterial] = useState("LDPE");
  const [res, setRes] = useState<any>(null);
  const [bought, setBought] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const search = async () => {
    setBusy("search"); setBought(null);
    try {
      const r = await post<any>("/api/bap/recycler/search", { material });
      setRes(r); setMessages(r.messages);
    } catch (e) {
      toast.show({ title: "Search failed", body: (e as Error).message, error: true });
    } finally { setBusy(null); }
  };
  const buy = async (lot: string) => {
    setBusy(lot);
    try {
      const r = await post<any>("/api/bap/recycler/buy", { lot, buyer, transactionId: res?.transactionId });
      setBought(r); setMessages(r.messages);
      toast.show({ title: `${lot} bought`, body: `${inr(Number(r.order.quote.price.value))} paid by delivery versus payment` });
      bump();
    } catch (e) {
      toast.show({ title: "Purchase failed", body: (e as Error).message, error: true });
    } finally { setBusy(null); }
  };
  return (
    <div className="stack" style={{ gap: 24 }}>
      <Card title="Find verified material" sub="A signed search in the material-lot domain reaches every NGO provider">
        <div className="row">
          <select className="select" style={{ width: 220 }} value={material} onChange={(e) => setMaterial(e.target.value)} aria-label="Material">
            {MATERIALS.map((m) => <option key={m} value={m}>{dir.material(m)}</option>)}
          </select>
          <Button onClick={search} loading={busy === "search"}>Search the open network</Button>
        </div>
      </Card>
      {bought && (
        <Alert tone="success" title={`Order ${bought.order.id}: material and payment moved together`}>
          {dir.name(buyer)} paid {inr(Number(bought.order.quote.price.value))} and received the material entitlement in one ledger transaction, with an EPR-ready supply claim disclosed alongside the sponsor's funded-recovery claim.{" "}
          <a href={`/lots/${bought.order.items[0].id}`} onClick={(e) => { e.preventDefault(); navigate(`/lots/${bought.order.items[0].id}`); }}>Open the lot</a>
        </Alert>
      )}
      {res && (
        <Card flush title={`${res.lots.length} verified lots offered`} sub="Prices are per verified kilogram; sponsor claims stay with the sponsor">
          <Table
            empty="No verified lots of this material are on offer."
            rowKey={(o: any) => o.item.id}
            columns={[
              { key: "c", header: "Lot", render: (o: any) => <LotLink code={o.item.id} /> },
              { key: "p", header: "Seller", render: (o: any) => o.provider.descriptor.name },
              { key: "q", header: "Verified", num: true, render: (o: any) => kg(Number(o.item.quantity.available.value)) },
              { key: "pr", header: "Price", num: true, render: (o: any) => inr(Number(o.item.quantity.available.value) * Number(o.item.price.value)) },
              { key: "cl", header: "Funded-recovery claim", render: (o: any) => <span className="small">{(o.item.tags.funded_recovery_claim_held_by ?? []).map((c: string) => dir.shortName(c)).join(", ") || "—"}</span> },
              { key: "v", header: "Verifier", render: (o: any) => <span className="small">{dir.shortName(o.item.tags.verifier)}</span> },
              { key: "b", header: "", render: (o: any) => <Button size="sm" loading={busy === o.item.id} disabled={!!busy} onClick={() => buy(o.item.id)}>Buy</Button> },
            ]}
            rows={res.lots}
          />
        </Card>
      )}
      {messages.length > 0 && <BecknMessages messages={messages} />}
    </div>
  );
}

function Inbound({ lots }: { lots: any[] }) {
  const { run, busy } = useAction();
  const [weights, setWeights] = useState<Record<string, string>>({});
  if (!lots.length) return <Card><div className="empty">No lots in transit to this site.</div></Card>;
  return (
    <Card flush title="Expected inbound lots" sub="Your weighbridge reading must be within 2% of the MRC weight">
      <Table
        rowKey={(l: any) => l.code}
        columns={[
          { key: "c", header: "Lot", render: (l: any) => <LotLink code={l.code} /> },
          { key: "m", header: "Material", render: (l: any) => l.materialLabel },
          { key: "a", header: "MRC weight", num: true, render: (l: any) => kg(l.aggregatedKg) },
          { key: "w", header: "Weighbridge (kg)", render: (l: any) => <input className="input mono" style={{ width: 120 }} value={weights[l.code] ?? ""} placeholder={(l.aggregatedKg * 0.993).toFixed(1)} onChange={(e) => setWeights({ ...weights, [l.code]: e.target.value })} /> },
          { key: "b", header: "", render: (l: any) => <Button size="sm" loading={busy === l.code} onClick={() => run(l.code, `/api/lots/${l.code}/receipt`, { kg: Number(weights[l.code] || (l.aggregatedKg * 0.993).toFixed(3)) }, () => `Receipt of ${l.code} attested`)}>Confirm receipt</Button> },
        ]}
        rows={lots}
      />
    </Card>
  );
}

function Purchased({ rows }: { rows: any[] }) {
  const { run, busy } = useAction();
  const [out, setOut] = useState<Record<string, string>>({});
  return (
    <Card flush title="Purchased lots" sub="Processing attestations complete the chain for your compliance records">
      <Table
        empty="No purchases yet."
        rowKey={(p: any) => p.code}
        columns={[
          { key: "c", header: "Lot", render: (p: any) => <LotLink code={p.code} /> },
          { key: "m", header: "Material", render: (p: any) => p.material },
          { key: "p", header: "Paid", num: true, render: (p: any) => inr(p.priceInr) },
          { key: "o", header: "Processed output (kg)", render: (p: any) => (p.processed ? <Badge tone="success">Attested</Badge> : <input className="input mono" style={{ width: 120 }} value={out[p.code] ?? ""} onChange={(e) => setOut({ ...out, [p.code]: e.target.value })} placeholder="kg" />) },
          { key: "b", header: "", render: (p: any) => (p.processed ? null : <Button size="sm" variant="secondary" disabled={!Number(out[p.code])} loading={busy === p.code} onClick={() => run(p.code, `/api/lots/${p.code}/process`, { kg: Number(out[p.code]) }, () => `Processing of ${p.code} attested`)}>Attest processing</Button>) },
        ]}
        rows={rows.slice().reverse()}
      />
    </Card>
  );
}
