import { useEffect, useState } from "react";
import { bump, post, useApi } from "../lib/api";
import { date, inr, kg, pct, policyLabels } from "../lib/format";
import { Link, navigate, setQuery, useLocation } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, ClaimStatus, ClaimType, ErrorNote, Field, Hash, KV, Loading, LotLink, PageHead, ProgrammeStatus, Progress, Stat, Table, Tabs, useToast } from "../components/ui";
import { BecknMessages } from "../components/BecknMessages";
import { AssistantPanel, type Draft } from "../components/Assistant";

const SPONSORS = ["TIDEWELL", "NEELKANTH", "COASTLINE"];
const MATERIALS = ["PET", "HDPE", "LDPE", "MLP", "NETS", "FOOTWEAR", "GLASS", "THERMOCOL"];

export default function Sponsor() {
  const { query } = useLocation();
  const as = SPONSORS.includes(query.get("as") ?? "") ? query.get("as")! : "TIDEWELL";
  const { data: me, error } = useApi<any>(`/api/participants/${as}`);
  const { data: exceptions } = useApi<any[]>("/api/exceptions");
  const dir = useDirectory();
  const [tab, setTab] = useState(query.get("tab") ?? "discover");
  const [draft, setDraft] = useState<Draft | null>(null);
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!me) return <Loading />;

  const funded = me.programmes.reduce((s: number, p: any) => s + (p.sponsors.find((x: any) => x.code === as)?.share ?? 0), 0);
  const released = me.programmes.reduce((s: number, p: any) => s + (p.paidInr * (p.sponsors.find((x: any) => x.code === as)?.share ?? 0)) / (p.fundedInr || 1), 0);
  const awaiting = (exceptions ?? []).filter((e) => !e.executed && !e.superseded && me.programmes.some((p: any) => p.code === e.programme) && !e.approvals.includes(as));

  return (
    <div className="page">
      <PageHead
        role="sponsor"
        eyebrow="Sponsor portal"
        title={me.name}
        lead="Find credible recovery programmes on the open network, commit funds to escrow, and hold exclusive claims you can prove to anyone."
        actions={
          <Field label="Acting as">
            <select className="select" value={as} onChange={(e) => setQuery("as", e.target.value)}>
              {SPONSORS.map((s) => (
                <option key={s} value={s}>{dir.name(s)}</option>
              ))}
            </select>
          </Field>
        }
      />

      {awaiting.map((e) => (
        <Alert key={e.hash} tone="warning" title={`Your approval is requested: ${e.kind.toLowerCase()} ${e.amountInr ? inr(e.amountInr) : ""} on ${e.programme}`} action={<Button size="sm" onClick={() => navigate(`/programmes/${e.programme}`)}>Review proposal</Button>}>
          {e.reason}
        </Alert>
      ))}

      <div className="grid g4">
        <Stat value={inr(funded)} label="Committed to escrow" detail={`${me.programmes.length} programme${me.programmes.length === 1 ? "" : "s"}`} accent="var(--role-sponsor)" />
        <Stat value={inr(released)} label="Released on verified outcomes" detail={`${pct(released / (funded || 1), 0)} of commitment`} accent="var(--role-sponsor)" />
        <Stat value={kg(me.claimSummary.fundedRecoveryKg, 0)} label="Exclusive funded-recovery claims" detail={`${me.claims.length} claims`} accent="var(--role-sponsor)" />
        <Stat value={me.claimSummary.contested + me.claimSummary.revoked} label="Contested or revoked claims" detail="Live status from the ledger" accent={me.claimSummary.contested ? "var(--status-warning)" : "var(--role-sponsor)"} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "discover", label: "Discover programmes" },
          { id: "assistant", label: "Assistant" },
          { id: "portfolio", label: "Portfolio", count: me.programmes.length },
          { id: "claims", label: "Claims wallet", count: me.claims.length },
        ]}
      />
      {tab === "discover" && <Discover sponsor={as} draft={draft} />}
      {tab === "assistant" && (
        <AssistantPanel
          key={as}
          role="sponsor"
          actingAs={as}
          intro="Describe what you want to fund. The assistant searches the open network, compares programmes on their ledger record and drafts a commitment for you to review. It cannot sign or fund."
          suggestions={[
            "Find coastal plastic recovery programmes in Maharashtra we can fund with ₹3 lakh this quarter; we want at least a third reaching collectors and independent verification.",
            "Which programmes recover fishing nets, and how have their providers performed?",
            "Compare programmes with at least 40% to collectors for ₹1.5 lakh.",
          ]}
          onDraft={(d) => { setDraft(d); setTab("discover"); }}
        />
      )}
      {tab === "portfolio" && (
        <Card flush>
          <Table
            empty="No programmes funded yet. Discover one on the open network."
            onRow={(p: any) => navigate(`/programmes/${p.code}`)}
            rowKey={(p: any) => p.code}
            columns={[
              { key: "t", header: "Programme", render: (p: any) => (<div><div className="strong">{p.title}</div><div className="small muted">{p.originatorName} · {p.region}</div></div>) },
              { key: "share", header: "Your commitment", num: true, render: (p: any) => inr(p.sponsors.find((x: any) => x.code === as)?.share) },
              { key: "pol", header: "Policy", render: (p: any) => <span className="small">{policyLabels[p.policy]}</span> },
              { key: "prog", header: "Verified vs target", width: 190, render: (p: any) => (<div className="stack" style={{ gap: 4 }}><Progress value={p.acceptedKg} max={p.targetKg} colour="var(--role-sponsor)" /><span className="small mono muted">{kg(p.acceptedKg, 0)} / {kg(p.targetKg, 0)}</span></div>) },
              { key: "rel", header: "Released", num: true, render: (p: any) => inr(p.paidInr) },
              { key: "held", header: "Held", num: true, render: (p: any) => inr(p.heldInr) },
              { key: "st", header: "Status", render: (p: any) => <ProgrammeStatus status={p.status} /> },
            ]}
            rows={me.programmes}
          />
        </Card>
      )}
      {tab === "claims" && (
        <Card flush title="Claims wallet" sub="Exclusive, non-transferable claims. Each has a certificate anyone can verify.">
          <Table
            rowKey={(c: any) => String(c.id)}
            onRow={(c: any) => c.certificate && navigate(`/verify/${c.certificate}`)}
            columns={[
              { key: "id", header: "Claim", render: (c: any) => <span className="mono">#{c.id}</span> },
              { key: "type", header: "Type", render: (c: any) => <ClaimType type={c.type} /> },
              { key: "lot", header: "Lot", render: (c: any) => <LotLink code={c.lotCode} /> },
              { key: "kg", header: "Quantity", num: true, render: (c: any) => kg(c.grams / 1000) },
              { key: "at", header: "Issued", render: (c: any) => <span className="small">{date(c.issuedAt)}</span> },
              { key: "cert", header: "Certificate", render: (c: any) => (c.certificate ? <Link to={`/verify/${c.certificate}`} className="mono small" onClick={(e) => e.stopPropagation()}>{c.certificate}</Link> : "—") },
              { key: "st", header: "Status", render: (c: any) => <ClaimStatus status={c.status} /> },
            ]}
            rows={me.claims}
          />
        </Card>
      )}
    </div>
  );
}

/** Beckn discovery and commitment: search → select → init → confirm, every message signed and logged. */
function Discover({ sponsor, draft }: { sponsor: string; draft?: Draft | null }) {
  const dir = useDirectory();
  const toast = useToast();
  const [intent, setIntent] = useState({ materials: ["NETS", "FOOTWEAR", "PET", "MLP"], minShare: 30, budget: 300000 });
  const [search, setSearch] = useState<any>(null);
  const [chosen, setChosen] = useState<any>(null);
  const [funding, setFunding] = useState(300000);
  const [quote, setQuote] = useState<any>(null);
  const [terms, setTerms] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (key: string, path: string, body: any) => {
    setBusy(key);
    try {
      const r = await post<any>(path, body);
      setMessages((m) => (r.messages ? [...m.filter((x) => x.transactionId !== r.transactionId), ...r.messages] : m));
      return r;
    } catch (e) {
      toast.show({ title: "The network returned an error", body: (e as Error).message, error: true });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const doSearch = async () => {
    setChosen(null); setQuote(null); setTerms(null); setOrder(null); setMessages([]);
    const r = await call("search", "/api/bap/sponsor/search", { materials: intent.materials, minCollectorShareBps: intent.minShare * 100, budgetInr: intent.budget });
    if (r) setSearch(r);
  };
  const doSelect = async (offer: any) => {
    setChosen(offer); setQuote(null); setTerms(null); setOrder(null);
    const r = await call("select", "/api/bap/sponsor/select", { transactionId: search.transactionId, bpp: offer.bpp, item: offer.item.id, fundingInr: funding });
    if (r) setQuote(r.response.order.quote);
  };
  const doInit = async () => {
    const r = await call("init", "/api/bap/sponsor/init", { transactionId: search.transactionId, bpp: chosen.bpp, item: chosen.item.id, fundingInr: funding, sponsor });
    if (r) setTerms(r.response.order.terms);
  };
  const doConfirm = async () => {
    const r = await call("confirm", "/api/bap/sponsor/confirm", { transactionId: search.transactionId, bpp: chosen.bpp, item: chosen.item.id, fundingInr: funding, sponsor });
    if (r) {
      setOrder(r.response.order);
      toast.show({ title: `Order ${r.response.order.id} active`, body: `${inr(funding)} held in escrow` });
      bump();
    }
  };

  /** An assistant draft opens here: search again on the network, select the drafted offer and request a quote. The sponsor decides the rest. */
  useEffect(() => {
    if (!draft || draft.kind !== "commitment") return;
    (async () => {
      setChosen(null); setQuote(null); setTerms(null); setOrder(null); setMessages([]);
      setFunding(draft.prefill.fundingInr);
      const r = await call("search", "/api/bap/sponsor/search", { materials: [], minCollectorShareBps: 0, budgetInr: draft.prefill.fundingInr });
      if (!r) return;
      setSearch(r);
      const offer = r.offers.find((o: any) => o.item.id === draft.prefill.item);
      if (!offer) return toast.show({ title: `${draft.prefill.item} is no longer offered`, body: "It may have been funded since the assistant drafted it.", error: true });
      setChosen(offer);
      const q = await call("select", "/api/bap/sponsor/select", { transactionId: r.transactionId, bpp: offer.bpp, item: offer.item.id, fundingInr: draft.prefill.fundingInr });
      if (q) setQuote(q.response.order.quote);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="stack" style={{ gap: 24 }}>
      {draft?.kind === "commitment" && (
        <Alert tone="info" title={`Assistant draft: ${draft.title}`}>
          {draft.summary} The offer below has been selected and quoted. Request the exact terms and decide; nothing is funded until you confirm.
        </Alert>
      )}
      <Card title="What do you want to fund?" sub="Your intent is broadcast by the network gateway to every registered NGO provider. Nothing is sent to a single platform.">
        <div className="grid g3" style={{ alignItems: "end" }}>
          <Field label="Materials">
            <div className="row" style={{ gap: 6 }}>
              {MATERIALS.map((m) => {
                const on = intent.materials.includes(m);
                return (
                  <button key={m} type="button" className={`tag`} style={{ cursor: "pointer", borderColor: on ? "var(--role-sponsor)" : undefined, background: on ? "#eceef8" : undefined }} onClick={() => setIntent({ ...intent, materials: on ? intent.materials.filter((x) => x !== m) : [...intent.materials, m] })} aria-pressed={on}>
                    {dir.material(m)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Minimum share to collectors" hint="Programmes below this are filtered out by the providers">
            <select className="select" value={intent.minShare} onChange={(e) => setIntent({ ...intent, minShare: Number(e.target.value) })}>
              {[0, 25, 30, 35, 40].map((v) => (
                <option key={v} value={v}>{v ? `${v}% or more` : "Any"}</option>
              ))}
            </select>
          </Field>
          <Field label="Budget (₹)">
            <input className="input mono" value={intent.budget} onChange={(e) => setIntent({ ...intent, budget: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
          </Field>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <Button onClick={doSearch} loading={busy === "search"}>Search the open network</Button>
          {busy === "search" && <span className="small muted">Waiting for signed catalogues from providers…</span>}
        </div>
      </Card>

      {search && (
        <Card title={`${search.offers.length} programmes from ${search.responders.length} providers`} sub="Track records come from the ledger, not from the providers' own claims">
          {search.offers.length === 0 && <div className="empty">No programme matched. Widen the materials or lower the minimum collector share.</div>}
          <div className="stack">
            {search.offers.map((o: any) => {
              const tr = o.provider.trackRecord;
              const tags = o.item.tags;
              const sel = chosen?.item.id === o.item.id;
              return (
                <div key={o.item.id} className="card" style={{ padding: 18, borderColor: sel ? "var(--role-sponsor)" : undefined, boxShadow: sel ? "inset 3px 0 0 var(--role-sponsor)" : undefined }}>
                  <div className="row between" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div className="strong" style={{ fontSize: 16 }}>{o.item.descriptor.name}</div>
                      <div className="small muted">{o.provider.descriptor.name} · {tags.region} · <span className="mono">{o.item.id}</span></div>
                      <p className="small" style={{ marginTop: 6 }}>{o.item.descriptor.short_desc}</p>
                      <div className="row" style={{ gap: 6, marginTop: 8 }}>
                        <Badge tone="brand">{policyLabels[tags.payment_policy]} · ₹{o.item.price.value}/kg</Badge>
                        <Badge>{tags.split_bps.collectors / 100}% to collectors</Badge>
                        <Badge>Verifier: {tags.verifier.name}</Badge>
                        <Badge>Deadline {tags.deadline}</Badge>
                      </div>
                    </div>
                    <div style={{ minWidth: 220 }}>
                      <div className="eyebrow" style={{ marginBottom: 6 }}>Ledger track record</div>
                      <KV
                        items={[
                          ["Verified", kg(tr.verifiedKg, 0)],
                          ["Lots", tr.lots],
                          ["Collectors paid", `${tr.collectorsPaid} · ${inr(tr.collectorIncentivesInr)}`],
                          ["Contested or revoked", tr.contestedOrRevokedClaims],
                        ]}
                      />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 12 }}>
                    <Button size="sm" variant={sel ? "primary" : "secondary"} onClick={() => doSelect(o)} loading={busy === "select" && chosen?.item.id === o.item.id} disabled={!!order}>
                      {sel ? "Selected" : "Select and request a quote"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {chosen && (
        <div className="grid g2">
          <Card title="Quote" sub={chosen.item.descriptor.name}>
            <div className="stack">
              <Field label="Funding (₹)">
                <div className="row">
                  <input className="input mono" style={{ maxWidth: 180 }} value={funding} onChange={(e) => setFunding(Number(e.target.value.replace(/\D/g, "")) || 0)} disabled={!!terms} />
                  <Button size="sm" variant="secondary" onClick={() => doSelect(chosen)} disabled={!!terms} loading={busy === "select"}>Re-quote</Button>
                </div>
              </Field>
              {quote && (
                <Table
                  columns={[
                    { key: "t", header: "Breakup", render: (b: any) => b.title },
                    { key: "v", header: "Amount", num: true, render: (b: any) => inr(Number(b.price.value)) },
                  ]}
                  rows={quote.breakup}
                />
              )}
              {quote && !terms && <Button onClick={doInit} loading={busy === "init"}>Request the exact terms</Button>}
            </div>
          </Card>
          <Card title="Terms and commitment" sub="Both parties sign this fingerprint; the escrow enforces it">
            {!terms ? (
              <div className="empty">Request the terms to see the document you will sign.</div>
            ) : (
              <div className="stack">
                <KV
                  items={[
                    ["Terms fingerprint", <Hash value={terms.fingerprint} n={10} />],
                    ...Object.entries(terms.document ?? {})
                      .filter(([k]) => ["paymentPolicy", "ratePerKgInr", "targetKg", "budgetInr", "challengeWindowHours", "deadline", "exceptions"].includes(k))
                      .map(([k, v]) => [k.replace(/([A-Z])/g, " $1").toLowerCase(), String(v)] as [string, string]),
                  ]}
                />
                {!order ? (
                  <>
                    <Alert tone="info" title={`Confirming moves ${inr(funding)} from ${dir.shortName(sponsor)} into escrow`}>
                      Funds are released only for verified outcomes after each challenge window. Unused funds return at expiry or by agreement of every party.
                    </Alert>
                    <Button onClick={doConfirm} loading={busy === "confirm"}>Fund escrow and confirm</Button>
                  </>
                ) : (
                  <Alert tone="success" title={`Order ${order.id} is active`}>
                    {dir.name(chosen.provider.id)} accepted the exact terms on the ledger. Commitment time {order.ledger?.commitment_time}. <Link to={`/programmes/${chosen.item.id}`}>Open the programme</Link>
                  </Alert>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {messages.length > 0 && <BecknMessages messages={messages} />}
    </div>
  );
}
