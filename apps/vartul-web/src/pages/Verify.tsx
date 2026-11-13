import { useEffect, useState } from "react";
import { post, useApi } from "../lib/api";
import { date, short } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { Alert, Badge, Button, Card, ErrorNote, Field, KV, Loading, PageHead } from "../components/ui";

const b64url = (s: string) => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
};

/** Independent check in this browser: resolve the issuer's DID document and verify the Ed25519 signature with WebCrypto. */
async function verifyInBrowser(jwt: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const [h, p, sig] = jwt.split(".");
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const did: string = header.kid.split("#")[0];
    const code = did.split(":").pop();
    const doc = await fetch(`/issuers/${code}/did.json`).then((r) => r.json());
    const vm = doc.verificationMethod.find((m: any) => m.id === header.kid) ?? doc.verificationMethod[0];
    const { kid: _kid, ...jwk } = vm.publicKeyJwk;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, key, b64url(sig), new TextEncoder().encode(`${h}.${p}`));
    return { ok, detail: ok ? `Verified locally with the public key in ${did}` : "The signature does not match the issuer's published key" };
  } catch (e) {
    return { ok: false, detail: `This browser could not run the check (${(e as Error).message}). The server-side result above still applies.` };
  }
}

export default function Verify({ id }: { id?: string }) {
  const [input, setInput] = useState(id ?? "");
  const [pasted, setPasted] = useState<any>(null);
  const [pastedError, setPastedError] = useState<string>();
  const { data: byId, error } = useApi<any>(id ? `/api/verify/${encodeURIComponent(id)}` : null);
  const result = id ? byId : pasted;
  const [local, setLocal] = useState<{ ok: boolean; detail: string } | null>(null);
  const [showJwt, setShowJwt] = useState(false);
  useEffect(() => {
    setLocal(null);
    if (result?.jwt) verifyInBrowser(result.jwt).then(setLocal);
  }, [result?.jwt]);
  useEffect(() => setInput(id ?? ""), [id]);

  const submit = async () => {
    const v = input.trim();
    if (!v) return;
    if (v.split(".").length === 3 && v.length > 100) {
      setPastedError(undefined);
      try {
        setPasted(await post("/api/verify", { jwt: v }));
        if (id) navigate("/verify");
      } catch (e) {
        setPastedError((e as Error).message);
      }
    } else {
      setPasted(null);
      navigate(`/verify/${encodeURIComponent(v.replace(/^.*\/verify\//, ""))}`);
    }
  };

  const s = result?.credential?.credentialSubject ?? {};
  return (
    <div className="page">
      <PageHead
        role="public"
        eyebrow="Public verification"
        title="Check a certificate without trusting anyone"
        lead="Scan a certificate's QR code, or paste its ID or the credential itself. The check covers the issuer's signature, the published revocation list and the live claim on the ledger, including whether anyone else claims the same kilograms."
      />
      <Card>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <Field label="Certificate ID, verification link or credential (JWT)">
              <input className="input mono" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="e.g. FRC-00001" />
            </Field>
          </div>
          <Button onClick={submit}>Verify</Button>
        </div>
      </Card>
      {(error || pastedError) && <ErrorNote error={error ?? pastedError} />}
      {id && !byId && !error && <Loading />}
      {result && (
        <>
          <div className={`verdict ${result.verdict}`}>
            <div style={{ flex: 1 }}>
              <div className="verdict-word">{result.verdict === "VALID" ? "Valid" : result.verdict === "CONTESTED" ? "Contested" : "Not valid"}</div>
              <p style={{ marginTop: 8, color: "var(--text-strong)" }}>
                {result.verdict === "VALID" && `${s.holder ?? s.collector ?? "The holder"}'s claim stands: signed by the issuer, not revoked, and matched on the ledger.`}
                {result.verdict === "CONTESTED" && "The certificate is genuine, but something it depends on is under review. Do not rely on it until the review concludes."}
                {result.verdict === "INVALID" && "This certificate should not be relied on. See the failed checks below."}
              </p>
            </div>
            {result.id && <img src={`/api/credentials/${result.id}/qr`} alt={`QR code for ${result.id}`} style={{ width: 112, height: 112, background: "#fff", padding: 6, border: "1px solid var(--border-subtle)" }} />}
          </div>
          <div className="grid g-wide" style={{ alignItems: "start" }}>
            <Card title="Checks" sub="Performed by the Vartul verifier service and, for the signature, again in your browser">
              {result.checks.map((c: any) => (
                <div key={c.check} className="check-row">
                  <span className={`tick ${c.ok ? "ok" : "no"}`}>{c.ok ? "✓" : "×"}</span>
                  <span className="strong">{c.check}</span>
                  <span>{c.detail}</span>
                </div>
              ))}
              <div className="check-row">
                <span className={`tick ${local?.ok ? "ok" : "no"}`} style={local ? undefined : { background: "var(--neutral-300)" }}>{local ? (local.ok ? "✓" : "×") : "…"}</span>
                <span className="strong">Signature, in this browser</span>
                <span>{local?.detail ?? "Checking…"}</span>
              </div>
            </Card>
            <Card title="What the certificate says">
              <KV
                items={[
                  ["Type", result.type?.replace(/([A-Z])/g, " $1").trim()],
                  ...(s.holder ? [["Holder", s.holder] as [string, string]] : []),
                  ...(s.claimType ? [["Claim", `#${s.claimId} · ${String(s.claimType).toLowerCase().replace(/_/g, " ")}`] as [string, string]] : []),
                  ...(s.quantityKg ? [["Quantity", `${s.quantityKg.toLocaleString("en-IN")} kg of ${s.material}`] as [string, string]] : []),
                  ...(s.lot ? [["Lot", <Link to={`/lots/${s.lot}`} className="mono">{s.lot}</Link>] as [string, any]] : []),
                  ...(s.region ? [["Region", s.region] as [string, string]] : []),
                  ...(s.collectedFrom ? [["Collected", `${s.collectedFrom} to ${s.collectedTo}`] as [string, string]] : []),
                  ...(s.recycler ? [["Received by", s.recycler] as [string, string]] : []),
                  ...(s.verifier ? [["Verified by", s.verifier] as [string, string]] : []),
                  ...(s.collectorsPaid ? [["Collectors paid", String(s.collectorsPaid)] as [string, string]] : []),
                  ...(s.verifiedKg !== undefined && !s.quantityKg ? [["Verified work", `${Number(s.verifiedKg).toLocaleString("en-IN")} kg`] as [string, string]] : []),
                  ["Issuer", result.credential?.issuer?.name],
                  ["Issued", date(result.credential?.iat)],
                  ...(s.settlementTransaction ? [["Settlement", <Link to={`/network/explorer/tx/${s.settlementTransaction}`} className="mono small">{short(s.settlementTransaction, 8)}</Link>] as [string, any]] : []),
                ]}
              />
              {s.statement && <p className="small muted" style={{ marginTop: 12 }}>{s.statement}</p>}
            </Card>
          </div>
          <Card title="The credential itself" sub="W3C Verifiable Credential 2.0, signed as a JWT (EdDSA). No personal data." actions={<Button size="sm" variant="ghost" onClick={() => setShowJwt((x) => !x)}>{showJwt ? "Hide" : "Show"}</Button>}>
            {showJwt ? (
              <div className="stack">
                <pre className="code">{result.jwt}</pre>
                <pre className="code">{JSON.stringify(result.credential, null, 2)}</pre>
              </div>
            ) : (
              <div className="row">
                <Badge>{result.header?.alg}</Badge>
                <Badge>{result.header?.typ}</Badge>
                <span className="small mono muted">{result.header?.kid}</span>
              </div>
            )}
          </Card>
        </>
      )}
      {!id && !pasted && (
        <Alert tone="info" title="Try one">
          <Link to="/verify/FRC-00001" className="mono">FRC-00001</Link>, a funded-recovery certificate held by Tidewell Foods. Verifier reports (VR-…) and participant credentials (PC-…) can be checked the same way.
        </Alert>
      )}
    </div>
  );
}
