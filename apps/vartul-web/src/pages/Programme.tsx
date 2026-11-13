import { useState } from "react";
import { useApi } from "../lib/api";
import { date, dateTime, inr, kg, policyLabels } from "../lib/format";
import { navigate } from "../lib/router";
import { useDirectory } from "../lib/directory";
import { SplitBar } from "../components/charts";
import { Alert, Badge, Button, Card, ClaimStatus, ClaimType, ErrorNote, Field, Hash, KV, Loading, LotLink, LotState, PageHead, ProgrammeStatus, Progress, Stat, Table, Tabs, TxLink, useAction } from "../components/ui";

export default function Programme({ code }: { code: string }) {
  const { data: p, error } = useApi<any>(`/api/programmes/${code}`);
  const dir = useDirectory();
  const [tab, setTab] = useState("lots");
  const { run, busy } = useAction();
  const [form, setForm] = useState({ kind: "SETTLE", amountInr: "", reason: "", evidence: "" });
  if (error) return <div className="page"><ErrorNote error={error} /></div>;
  if (!p) return <Loading />;

  const parties = [p.originator, ...p.sponsors.map((s: any) => s.code)];
  const openExceptions = p.exceptions.filter((e: any) => !e.executed && !e.superseded);
  const shortfall = p.policy === "FIXED_ON_TARGET" && p.acceptedKg < p.targetKg && p.status === "ACTIVE";

  return (
    <div className="page">
      <PageHead
        role="network"
        eyebrow={<><span className="mono">{p.code}</span><ProgrammeStatus status={p.status} /></>}
        title={p.title}
        lead={p.description}
      />

      <div className="grid g4">
        <Stat value={inr(p.fundedInr)} label="Committed in escrow" detail={p.sponsors.map((s: any) => `${dir.shortName(s.code)} ${inr(s.share)}`).join(" · ")} accent="var(--role-sponsor)" />
        <Stat value={inr(p.paidInr)} label="Released on verified outcomes" detail={`${inr(p.collectorPayoutsInr)} to ${p.collectorsPaid} collectors`} />
        <Stat value={inr(p.heldInr)} label="Still held" detail={p.refundedInr ? `${inr(p.refundedInr)} refunded to sponsors` : "Refundable at expiry or by agreement"} />
        <Stat value={kg(p.acceptedKg, 0)} label={`Verified of ${kg(p.targetKg, 0)} target`} detail={<Progress value={p.acceptedKg} max={p.targetKg} />} />
      </div>

      {shortfall && !openExceptions.length && (
        <Alert tone="warning" title={`Target not met: ${kg(p.acceptedKg, 0)} verified against ${kg(p.targetKg, 0)}`}>
          A fixed-on-target programme pays nothing automatically on a shortfall. Any party may propose a settlement, extension or resumption; every party must approve the exact proposal before anything moves.
        </Alert>
      )}

      {openExceptions.map((e: any) => (
        <Card key={e.hash} title={`Proposed exception: ${e.kind === "SETTLE" ? `settle for ${inr(e.amountInr)}` : e.kind.toLowerCase()}`} sub={`Proposed by ${dir.name(e.proposedBy)} · ${dateTime(e.at)} · fingerprint ${e.hash.slice(0, 14)}…`}>
          <div className="stack">
            <p>{e.reason}</p>
            {e.evidence?.length > 0 && (
              <div className="small">
                <span className="muted">Evidence: </span>
                {e.evidence.join(" · ")}
              </div>
            )}
            {e.kind === "SETTLE" && (
              <SplitBar
                format={inr}
                parts={[
                  { label: "Paid on approval", value: e.amountInr, colour: "var(--suma-teal-600)" },
                  { label: "Refunded to sponsors pro rata", value: Math.max(0, p.fundedInr - p.paidInr - e.amountInr), colour: "var(--neutral-300)" },
                ]}
              />
            )}
            <div className="divider" />
            <div className="row">
              {parties.map((party) => {
                const approved = e.approvals.includes(party);
                const role = party === p.originator ? "ORIGINATOR" : "SPONSOR";
                return approved ? (
                  <Badge key={party} tone="success" dot>{dir.shortName(party)} approved</Badge>
                ) : (
                  <Button key={party} size="sm" variant="secondary" loading={busy === `approve:${party}`} onClick={() => run(`approve:${party}`, `/api/programmes/${p.code}/exceptions/${e.hash}/approve`, { actor: `${party}:${role}` }, () => `${dir.shortName(party)} approved the exact proposal`)}>
                    Approve as {dir.shortName(party)}
                  </Button>
                );
              })}
            </div>
            <p className="small muted">Approval binds to the proposal fingerprint. The final approval executes payment, collector payouts, claims and the refund in one transaction.</p>
          </div>
        </Card>
      ))}

      <div className="grid g-wide">
        <Card title="Signed terms" sub="Both parties signed the same terms fingerprint; the escrow enforces them">
          <KV
            items={[
              ["Terms fingerprint", <Hash value={p.termsHash} n={10} />],
              ["Payment policy", `${policyLabels[p.policy]}${p.policy === "PER_KG_CAPPED" ? ` · ₹${p.ratePerKg} per verified kg` : ` · ${inr(p.budgetInr)} at ${kg(p.targetKg, 0)}`}`],
              ["Settlement split", `${p.split.collectorsBps / 100}% collectors · ${p.split.originatorBps / 100}% originator · ${p.split.verifierBps / 100}% verifier`],
              ["Challenge window", `${p.challengeHours} hours after verification`],
              ["Region and materials", `${p.region} · ${p.materials.map((m: string) => dir.material(m)).join(", ")}`],
              ["Verifier", dir.name(p.verifier)],
              ["Committed", dateTime(p.commitmentTime)],
              ["Deadline", date(p.deadline)],
              ["Eligibility", p.terms.eligibility],
              ["Exceptions", p.terms.exceptions],
              ["Disputes", p.terms.disputes],
            ]}
          />
        </Card>
        <Card title="Propose an exception" sub="Programme parties only: settle, extend or resume, with reason and evidence">
          <div className="stack">
            <Field label="Kind">
              <select className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="SETTLE">Settle for an amount</option>
                <option value="EXTEND">Extend the deadline</option>
              </select>
            </Field>
            {form.kind === "SETTLE" && (
              <Field label="Amount (₹)" hint={`At most ${inr(p.fundedInr - p.paidInr)} remains in escrow`}>
                <input className="input mono" inputMode="numeric" value={form.amountInr} onChange={(e) => setForm({ ...form, amountInr: e.target.value })} placeholder={String(Math.floor(((p.acceptedKg / p.targetKg) * p.budgetInr) / 100) * 100 || "")} />
              </Field>
            )}
            <Field label="Reason">
              <textarea className="textarea" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="What changed, and why this outcome is fair" />
            </Field>
            <Field label="Evidence" hint="One reference per line; each is fingerprinted with the proposal">
              <textarea className="textarea" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
            </Field>
            <Button
              disabled={!form.reason || (form.kind === "SETTLE" && !Number(form.amountInr)) || p.status !== "ACTIVE"}
              loading={busy === "propose"}
              onClick={() =>
                run("propose", `/api/programmes/${p.code}/exceptions`, {
                  actor: `${p.originator}:ORIGINATOR`,
                  kind: form.kind,
                  amountInr: Number(form.amountInr) || undefined,
                  newDeadline: form.kind === "EXTEND" ? new Date((p.deadline + 90 * 86400) * 1000).toISOString().slice(0, 10) : undefined,
                  reason: form.reason,
                  evidence: form.evidence.split("\n").map((x) => x.trim()).filter(Boolean),
                }, () => "Exception proposed; awaiting every party's approval")
              }
            >
              Propose as {dir.shortName(p.originator)}
            </Button>
          </div>
        </Card>
      </div>

      <Card flush>
        <div style={{ padding: "0 20px" }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "lots", label: "Recovery lots", count: p.lots.length },
              { id: "claims", label: "Sponsor claims", count: p.claims.length },
              { id: "exceptions", label: "Exceptions", count: p.exceptions.length },
              { id: "history", label: "Ledger history", count: p.history.length },
            ]}
          />
        </div>
        {tab === "lots" && (
          <Table
            onRow={(l: any) => navigate(`/lots/${l.code}`)}
            rowKey={(l: any) => l.code}
            columns={[
              { key: "code", header: "Lot", render: (l: any) => <span className="mono">{l.code}</span> },
              { key: "mat", header: "Material", render: (l: any) => l.materialLabel },
              { key: "v", header: "From", render: (l: any) => <span className="small">{[...new Set(l.villages as string[])].map((v) => dir.village(v)).join(", ")}</span> },
              { key: "agg", header: "Weighed", num: true, render: (l: any) => kg(l.aggregatedKg) },
              { key: "el", header: "Eligible", num: true, render: (l: any) => kg(l.eligibleKg) },
              { key: "state", header: "State", render: (l: any) => <LotState state={l.state} /> },
            ]}
            rows={p.lots}
          />
        )}
        {tab === "claims" && (
          <Table
            rowKey={(c: any) => String(c.id)}
            onRow={(c: any) => c.certificate && navigate(`/verify/${c.certificate}`)}
            columns={[
              { key: "id", header: "Claim", render: (c: any) => <span className="mono">#{c.id}</span> },
              { key: "type", header: "Type", render: (c: any) => <ClaimType type={c.type} /> },
              { key: "holder", header: "Holder", render: (c: any) => c.holderName },
              { key: "lot", header: "Lot", render: (c: any) => <LotLink code={c.lotCode} /> },
              { key: "kg", header: "Quantity", num: true, render: (c: any) => kg(c.grams / 1000) },
              { key: "cert", header: "Certificate", render: (c: any) => <span className="mono small">{c.certificate ?? "—"}</span> },
              { key: "status", header: "Status", render: (c: any) => <ClaimStatus status={c.status} /> },
            ]}
            rows={p.claims}
          />
        )}
        {tab === "exceptions" && (
          <Table
            empty="No exceptions proposed. Outcomes stand as verified."
            rowKey={(e: any) => e.hash}
            columns={[
              { key: "kind", header: "Kind", render: (e: any) => e.kind },
              { key: "amt", header: "Amount", num: true, render: (e: any) => (e.amountInr ? inr(e.amountInr) : "—") },
              { key: "reason", header: "Reason", render: (e: any) => <span className="small">{e.reason}</span> },
              { key: "appr", header: "Approvals", render: (e: any) => `${e.approvals.length} of ${parties.length}` },
              { key: "st", header: "Outcome", render: (e: any) => (e.executed ? <Badge tone="success" dot>Executed</Badge> : e.superseded ? <Badge>Superseded</Badge> : <Badge tone="warning" dot>Awaiting approval</Badge>) },
            ]}
            rows={p.exceptions}
          />
        )}
        {tab === "history" && (
          <Table
            rowKey={(t: any) => t.hash}
            columns={[
              { key: "at", header: "When", render: (t: any) => <span className="small">{dateTime(t.at)}</span> },
              { key: "action", header: "Action", render: (t: any) => t.action },
              { key: "who", header: "Signed by", render: (t: any) => <span className="small">{dir.name(t.participant)}</span> },
              { key: "tx", header: "Transaction", render: (t: any) => <TxLink hash={t.hash} /> },
            ]}
            rows={p.history}
          />
        )}
      </Card>
    </div>
  );
}
