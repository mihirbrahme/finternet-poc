import { useEffect } from "react";
import { useApi } from "../lib/api";
import { dateTime, kg } from "../lib/format";
import { useDirectory } from "../lib/directory";
import { Alert, Badge, Button, Card, Hash, KV, Loading, Simulated } from "./ui";

/** One collection record: evidence, signatures, flags and its Merkle inclusion proof against the lot root on the ledger. */
export function RecordDrawer({ lot, record, onClose }: { lot?: string; record: string; onClose: () => void }) {
  const { data: r } = useApi<any>(`/api/records/${record}`);
  const { data: proof } = useApi<any>(lot ? `/api/lots/${lot}/proof/${record}` : null);
  const dir = useDirectory();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={`Collection record ${record}`} onClick={(e) => e.stopPropagation()}>
        <div className="card-head" style={{ position: "sticky", top: 0, background: "var(--surface-page)", zIndex: 1 }}>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Collection record</div>
            <h3 className="mono">{record}</h3>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close">×</Button>
        </div>
        {!r ? (
          <Loading />
        ) : (
          <div className="card-body stack">
            {r.flags?.length > 0 && (
              <Alert tone="warning" title="Anomaly flags on this record">
                {r.flags.map((f: any) => (typeof f === "string" ? f : f.explanation)).join(" ")}
              </Alert>
            )}
            <div className="grid g2">
              <div className="stack" style={{ gap: 8 }}>
                <img className="evidence-photo" src={`/api/evidence/${r.id}`} alt={`Evidence photo for ${r.id}`} />
                <div className="row small muted">
                  <Simulated>Illustrative photo</Simulated> Only its fingerprint is anchored.
                </div>
              </div>
              <KV
                items={[
                  ["Collector", <span className="mono">{r.saathi}</span>],
                  ["Organisation", dir.name(r.org)],
                  ["Material", dir.material(r.material)],
                  ["Weight", <span className="mono">{kg(r.grams / 1000)}</span>],
                  ["Route", r.route],
                  ["Village", dir.village(r.village)],
                  ["Captured", dateTime(r.capturedAt)],
                  ["Synced", dateTime(r.syncedAt)],
                  ["Location", <span className="mono small">{r.lat.toFixed(5)}, {r.lng.toFixed(5)} (±{r.gpsAccuracyM} m)</span>],
                  ["Scale", r.scale],
                  ["Assisted capture", r.assisted ? "Yes, by supervisor with consent" : "No"],
                ]}
              />
            </div>
            <Card title="Signatures and fingerprints">
              <KV
                items={[
                  ["Record fingerprint", <Hash value={r.fingerprint} n={10} />],
                  ["Photo fingerprint", <Hash value={r.photoHash} n={10} />],
                  ["Device signature", <span className="row" style={{ gap: 8 }}><Hash value={r.deviceSignature} n={8} />{r.deviceSigned ? <Badge tone="success">Valid</Badge> : <Badge tone="danger">Invalid</Badge>}</span>],
                  ["Supervisor co-signature", r.supervisorSignature ? <Hash value={r.supervisorSignature} n={8} /> : "—"],
                ]}
              />
            </Card>
            {proof && (
              <Card title="Inclusion in the lot" sub="Recompute the Merkle path from this record's fingerprint to the root stored on the ledger">
                <div className="stack">
                  <div className="row">
                    {proof.verified ? <Badge tone="success" dot>Proof verifies against the on-ledger root</Badge> : <Badge tone="danger" dot>Proof does not verify</Badge>}
                  </div>
                  <KV
                    items={[
                      ["Leaf", <Hash value={proof.leaf} n={10} />],
                      ...proof.proof.map((h: string, i: number) => [`Sibling ${i + 1}`, <Hash value={h} n={10} />] as [string, any]),
                      ["Root", <Hash value={proof.root} n={10} />],
                    ]}
                  />
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
