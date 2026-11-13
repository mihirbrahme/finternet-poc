import { useState } from "react";
import { useApi } from "../lib/api";
import { dateTime, duration, inr, kg, shortDate } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, ClaimStatus, ClaimType, ErrorNote, Hash, KV, Loading, LotState, PageHead, Table, Tabs, TxLink, useAction } from "../components/ui";
import { RecordDrawer } from "../components/RecordDrawer";

const stageNames: Record<string, string> = { aggregation: "Weighed and minted at the MRC", dispatch: "Dispatched", receipt: "Received at the recycler", verification: "Verified", processing: "Processed" };

export default function Lot({ code }: { code: string }) {
  const { data: l, error } = useApi<any>(`/api/lots/${code}`);
  const { data: clock } = useApi<{ now: number }>("/api/clock");
  const dir = useDirectory();
  const [tab, setTab] = useState("records");
  const [record, setRecord] = useState<string | null>(null);
  const { run, busy } = useAction();
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!l) return <Loading />;

  const now = clock?.now ?? 0;
  const att = (stage: string) => l.attestations.find((a: any) => a.stage === stage);
  const mb = l.massBalance;
  const paidTotal = l.payouts.reduce((s: number, p: any) => s + p.amountInr, 0);
  const windowOpen = l.state === "VERIFIED" && l.challengeDeadline > now;
  const canFinalise = l.state === "VERIFIED" && l.challengeDeadline <= now;
  const revoked = l.attestations.filter((a: any) => a.revoked);
  const holders = Object.entries(l.projection.holders ?? {}) as [string, number][];

  const steps = [
    {
      key: "collection",
      done: true,
      title: `${l.records.length} signed collection records from ${l.collectors.length} collectors`,
      meta: `${shortDate(l.windowStart)} to ${shortDate(l.windowEnd)} · ${[...new Set(l.villages as string[])].map((v) => dir.village(v)).join(", ")} · Merkle root ${l.proofRootMatches ? "matches the ledger" : "does not match"}`,
    },
    ...["aggregation", "dispatch", "receipt", "verification", "processing"].map((stage) => {
      const a = att(stage);
      let detail = "";
      if (stage === "aggregation") detail = `${kg(l.aggregatedKg)} weighed (${l.bale})`;
      if (stage === "dispatch") detail = l.transportDoc ? `${l.transportDoc.document} · vehicle ${l.transportDoc.vehicle} to ${dir.name(l.receiver)}` : "";
      if (stage === "receipt") detail = l.weighSlip ? `Weighbridge slip ${l.weighSlip.slip}: ${kg(l.receivedKg)}` : "";
      if (stage === "verification") detail = l.verification ? `${kg(l.eligibleKg)} eligible · ${l.verification.excluded.length ? `${kg(l.verification.excluded.reduce((s: number, e: any) => s + e.grams, 0) / 1000)} excluded` : "nothing excluded"} · report ${l.verification.report}` : "";
      if (stage === "processing") detail = a ? `${kg(a.quantityKg)} processed into pellets` : "";
      return { key: stage, done: !!a && !a.revoked, revoked: !!a?.revoked, title: stageNames[stage], meta: a ? `${detail} · ${a.participantName} · ${dateTime(a.at)}` : "", tx: a?.tx, hide: stage === "processing" && !a };
    }),
    {
      key: "window",
      done: ["SETTLED"].includes(l.state) || canFinalise,
      warn: windowOpen || l.state === "CHALLENGED",
      title: l.state === "CHALLENGED" ? "Challenged during the window" : windowOpen ? `Challenge window open: ${duration(l.challengeDeadline - now)} left` : "Challenge window",
      meta: l.challengeDeadline ? `Closes ${dateTime(l.challengeDeadline)}${l.challenge ? ` · challenged by ${dir.name(l.challenge.by)}: ${l.challenge.reason}` : ""}` : "Opens on verification",
    },
    {
      key: "settle",
      done: l.state === "SETTLED" || l.state === "UNDER_REVIEW",
      title: l.state === "SETTLED" || l.payouts.length ? `Settled: ${inr(paidTotal)} to ${l.payouts.length} collectors` : "Settlement",
      meta: l.payouts.length ? `Payout transaction ${l.payouts[0].txHash.slice(0, 12)}… · ${l.claims.length} claim${l.claims.length === 1 ? "" : "s"} allocated` : "Payment, payouts and claims in one transaction",
      tx: l.payouts[0]?.txHash,
    },
  ].filter((s: any) => !s.hide);

  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow={<><span className="mono">{l.code}</span><LotState state={l.state} />{l.sold && <Badge tone="brand">Sold</Badge>}</>}
        title={`${kg(l.eligibleKg || l.aggregatedKg, 0)} of ${l.materialLabel} from ${[...new Set(l.villages as string[])].length > 2 ? `${[...new Set(l.villages as string[])].length} villages` : [...new Set(l.villages as string[])].map((v) => dir.village(v)).join(" and ")}`}
        lead={<>Recovered under <Link to={`/programmes/${l.programme}`}>{l.programmeTitle}</Link>, aggregated by {dir.name(l.originator)}, verified by {dir.name(l.verifier)}.</>}
        actions={
          <>
            {canFinalise && (
              <Button loading={busy === "finalize"} onClick={() => run("finalize", `/api/lots/${l.code}/finalize`, {}, () => `${l.code} settled`)}>
                Settle now
              </Button>
            )}
          </>
        }
      />

      {l.state === "UNDER_REVIEW" && (
        <Alert tone="warning" title="Under review: an attestation this lot depends on was revoked">
          {revoked.map((a: any) => `${stageNames[a.stage]} by ${a.participantName} revoked: ${a.revoked.reason}`).join(" · ")}. Every claim on this lot now reads contested until the review concludes.
        </Alert>
      )}
      {l.lotFlags.length > 0 && (
        <Alert tone="warning" title={`${l.lotFlags.length} anomaly flag${l.lotFlags.length > 1 ? "s" : ""} travel with this lot`}>
          {l.lotFlags.map((f: any) => f.explanation).join(" ")}
        </Alert>
      )}

      <div className="grid g-wide">
        <Card title="Proof chain" sub="Each step is a signed attestation by the responsible party, recorded on the ledger">
          <div className="chain">
            {steps.map((s: any) => (
              <div key={s.key} className={`chain-step ${s.revoked ? "bad" : s.warn ? "warn" : s.done ? "done" : ""}`}>
                <span className="chain-node" />
                <div>
                  <div className="chain-title row" style={{ gap: 8 }}>
                    {s.title}
                    {s.revoked && <Badge tone="danger">Revoked</Badge>}
                  </div>
                  {s.meta && <div className="chain-meta">{s.meta}</div>}
                  {s.tx && <div style={{ marginTop: 4 }}><TxLink hash={s.tx} /></div>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="stack">
          <Card title="Mass balance" sub="Checked by the ledger at mint; tolerance 1% at the MRC, 2% at the recycler">
            <Table
              columns={[
                { key: "k", header: "Quantity", render: (r: any) => r[0] },
                { key: "v", header: "", num: true, render: (r: any) => r[1] },
              ]}
              rows={[
                ["Captured in signed records", kg(mb.inputKg, 1)],
                ["Contamination removed at sorting", `− ${kg(mb.contaminationKg, 1)}`],
                ["Net of contamination", kg(mb.netKg, 1)],
                ["Weighed into the bale", kg(mb.aggregatedKg, 1)],
                ["Recycler weighbridge", mb.receivedKg ? kg(mb.receivedKg, 1) : "—"],
                ["Eligible after verification", mb.eligibleKg ? kg(mb.eligibleKg, 1) : "—"],
              ]}
            />
          </Card>
          <Card title="Rights in this lot" sub="One physical lot, separately governed rights">
            <KV
              items={[
                ["Material entitlement", holders.length ? holders.map(([h, g]) => `${dir.shortName(h)} (${kg(g / 1000)})`).join(", ") : "—"],
                ["Collector incentives", l.payouts.length ? `${inr(paidTotal)} paid to ${l.payouts.length} collectors` : "Paid at settlement"],
                ...l.claims.map((c: any) => [<ClaimType type={c.type} />, <span className="row" style={{ gap: 8 }}>{c.holderName} · {kg(c.grams / 1000)} <ClaimStatus status={c.status} /></span>] as [any, any]),
              ]}
            />
          </Card>
        </div>
      </div>

      {l.verification && (
        <Card title="Verification" sub={`${dir.name(l.verifier)} · report ${l.verification.report}`}>
          <div className="stack">
            <p>{l.verification.notes}</p>
            {l.verification.excluded.length > 0 && (
              <Table
                columns={[
                  { key: "s", header: "Collector", render: (e: any) => <span className="mono">{e.saathi}</span> },
                  { key: "kg", header: "Excluded", num: true, render: (e: any) => kg(e.grams / 1000) },
                  { key: "r", header: "Reason", render: (e: any) => <span className="small">{e.reason}</span> },
                ]}
                rows={l.verification.excluded}
              />
            )}
            <div className="small muted">
              Sampled {l.verification.sampled.length} records · report fingerprint <Hash value={l.verification.reportHash} />
            </div>
          </div>
        </Card>
      )}

      <Card flush>
        <div style={{ padding: "0 20px" }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "records", label: "Collection records", count: l.records.length },
              { id: "collectors", label: "Collectors and payouts", count: l.collectors.length },
              { id: "claims", label: "Claims and certificates", count: l.claims.length + l.credentials.length },
              { id: "tx", label: "Ledger transactions", count: l.transactions.length },
            ]}
          />
        </div>
        {tab === "records" && (
          <div className="scroll"><Table
            onRow={(r: any) => setRecord(r.id)}
            rowKey={(r: any) => r.id}
            columns={[
              { key: "id", header: "Record", render: (r: any) => <span className="mono small">{r.id}</span> },
              { key: "s", header: "Collector", render: (r: any) => <span className="mono small">{r.saathi}</span> },
              { key: "route", header: "Route", render: (r: any) => <span className="small">{r.route}</span> },
              { key: "at", header: "Captured", render: (r: any) => <span className="small">{dateTime(r.capturedAt)}</span> },
              { key: "kg", header: "Weight", num: true, render: (r: any) => kg(r.kg) },
              { key: "sig", header: "Signatures", render: (r: any) => <span className="small">{r.deviceSigned ? "Device" : "—"}{r.supervisorCosigned ? " + supervisor" : ""}</span> },
              { key: "flags", header: "", render: (r: any) => (r.flags.length ? <Badge tone="warning">{r.flags.join(", ").toLowerCase().replace(/_/g, " ")}</Badge> : null) },
            ]}
            rows={l.records}
          /></div>
        )}
        {tab === "collectors" && (
          <Table
            rowKey={(c: any) => c.saathi}
            onRow={(c: any) => navigate(`/field?saathi=${c.saathi}`)}
            columns={[
              { key: "s", header: "Collector (pseudonymous)", render: (c: any) => <span className="mono">{c.saathi}</span> },
              { key: "kg", header: "Contributed", num: true, render: (c: any) => kg(c.kg) },
              { key: "ex", header: "Excluded", num: true, render: (c: any) => (c.excludedKg ? kg(c.excludedKg) : "—") },
              { key: "paid", header: "Paid", num: true, render: (c: any) => (c.paidInr ? inr(c.paidInr, 2) : "—") },
              { key: "utr", header: "UPI reference (sandbox)", render: (c: any) => <span className="mono small">{c.payout?.utr ?? "—"}</span> },
            ]}
            rows={l.collectors}
          />
        )}
        {tab === "claims" && (
          <div className="stack" style={{ gap: 0 }}>
            <Table
              empty="Claims are allocated at settlement."
              rowKey={(c: any) => String(c.id)}
              onRow={(c: any) => c.certificate && navigate(`/verify/${c.certificate}`)}
              columns={[
                { key: "id", header: "Claim", render: (c: any) => <span className="mono">#{c.id}</span> },
                { key: "type", header: "Type", render: (c: any) => <ClaimType type={c.type} /> },
                { key: "holder", header: "Holder", render: (c: any) => c.holderName },
                { key: "kg", header: "Quantity", num: true, render: (c: any) => kg(c.grams / 1000) },
                { key: "disc", header: "Disclosed alongside", render: (c: any) => <span className="small">{c.disclosures.length ? c.disclosures.join(", ").toLowerCase().replace(/_/g, " ") : "—"}</span> },
                { key: "st", header: "Status", render: (c: any) => <ClaimStatus status={c.status} /> },
              ]}
              rows={l.claims}
            />
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)" }} className="row">
              <span className="small muted">Credentials:</span>
              {l.credentials.map((c: any) => (
                <Link key={c.id} to={`/verify/${c.id}`} className="mono small">{c.id}</Link>
              ))}
            </div>
          </div>
        )}
        {tab === "tx" && (
          <Table
            rowKey={(t: any) => t.hash}
            columns={[
              { key: "at", header: "When", render: (t: any) => <span className="small">{dateTime(t.at)}</span> },
              { key: "action", header: "Action", render: (t: any) => t.action },
              { key: "ev", header: "Events", render: (t: any) => <span className="small muted">{[...new Set(t.events.map((e: any) => e.event))].join(", ")}</span> },
              { key: "tx", header: "Transaction", render: (t: any) => <TxLink hash={t.hash} /> },
            ]}
            rows={l.transactions}
          />
        )}
      </Card>
      {record && <RecordDrawer lot={l.code} record={record} onClose={() => setRecord(null)} />}
    </div>
  );
}
