import { useState } from "react";
import { bump, post, useApi } from "../lib/api";
import { navigate } from "../lib/router";
import { Button } from "./ui";

export interface SceneStep {
  id: string;
  label: string;
  actor: string;
  detail: string;
  done: boolean;
  next: boolean;
}
export interface SceneView {
  id: string;
  number: number;
  title: string;
  question: string;
  narrative: string;
  points: string[];
  surface: string;
  active: boolean;
  steps: SceneStep[];
}
interface StepOutcome {
  summary: string;
  error?: boolean;
  refs?: { lot?: string; programme?: string; tx?: string; credential?: string; transactionId?: string; saathi?: string };
}

/** Reset the sandbox to the start of a scene, then open the surface the scene is told on. */
export async function openScene(scene: SceneView | string, go = true) {
  const id = typeof scene === "string" ? scene : scene.id;
  const r = await post<SceneView>(`/api/scenes/${id}/reset`);
  bump();
  if (go) navigate(r.surface);
  return r;
}

export function Presenter({ onClose }: { onClose: () => void }) {
  const { data } = useApi<{ current: string; scenes: SceneView[] }>("/api/scenes");
  const [results, setResults] = useState<Record<string, StepOutcome>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const scene = data?.scenes.find((s) => s.id === data.current) ?? data?.scenes[0];

  const jump = async (s: SceneView) => {
    setBusy(`reset:${s.id}`);
    try {
      await openScene(s);
      setResults((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith(`${s.id}:`))));
    } catch (e) {
      setResults((r) => ({ ...r, [`${s.id}:reset`]: { summary: (e as Error).message, error: true } }));
    } finally {
      setBusy(null);
    }
  };

  const runStep = async (s: SceneView, step: SceneStep) => {
    const key = `${s.id}:${step.id}`;
    setBusy(key);
    try {
      const r = await post<{ result: StepOutcome }>(`/api/scenes/${s.id}/steps/${step.id}`);
      setResults((x) => ({ ...x, [key]: r.result }));
      bump();
    } catch (e) {
      setResults((x) => ({ ...x, [key]: { summary: (e as Error).message, error: true } }));
    } finally {
      setBusy(null);
    }
  };

  if (!data || !scene) return <aside className="presenter" aria-label="Presenter" />;
  const idx = data.scenes.indexOf(scene);
  const prev = data.scenes[idx - 1];
  const next = data.scenes[idx + 1];
  const resetError = results[`${scene.id}:reset`];

  return (
    <aside className="presenter" aria-label="Presenter">
      <div className="presenter-head">
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ color: "var(--suma-cyan-300)" }}>
            Scene {scene.number} of {data.scenes.length}
          </div>
        </div>
        <Button variant="inverse" size="sm" onClick={onClose} aria-label="Close presenter">
          ×
        </Button>
      </div>
      <div className="presenter-body">
        <div className="p-scenes" role="tablist" aria-label="Scenes">
          {data.scenes.map((s) => (
            <button key={s.id} className={`p-scene ${s.id === scene.id ? "active" : ""}`} title={`${s.number}. ${s.title}`} onClick={() => jump(s)} disabled={!!busy}>
              {busy === `reset:${s.id}` ? "…" : s.number}
            </button>
          ))}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <h2>{scene.title}</h2>
          <p className="q">{scene.question}</p>
        </div>
        <p className="narr">{scene.narrative}</p>
        <div className="row">
          <Button variant="inverse" size="sm" onClick={() => navigate(scene.surface)}>
            Open the scene's view
          </Button>
          <Button variant="inverse" size="sm" onClick={() => jump(scene)} loading={busy === `reset:${scene.id}`}>
            Reset scene
          </Button>
        </div>
        {resetError && <div className="p-step-result error">{resetError.summary}</div>}

        {scene.steps.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="eyebrow" style={{ color: "var(--suma-cyan-300)" }}>
              Live steps on the ledger
            </div>
            {scene.steps.map((st, i) => {
              const key = `${scene.id}:${st.id}`;
              const res = results[key];
              return (
                <div key={st.id} className={`p-step ${st.done ? "done" : ""} ${st.next ? "next" : ""}`}>
                  <div className="p-step-title">
                    <span className="p-step-num">{st.done ? "✓" : i + 1}</span>
                    <span style={{ flex: 1 }}>{st.label}</span>
                    {st.next && (
                      <Button size="sm" onClick={() => runStep(scene, st)} loading={busy === key} disabled={!!busy && busy !== key}>
                        Run
                      </Button>
                    )}
                  </div>
                  <div className="p-step-meta">
                    {st.actor} · {st.detail}
                  </div>
                  {res && (
                    <div className={`p-step-result ${res.error ? "error" : ""}`}>
                      {res.summary}
                      {res.refs && (
                        <div className="row" style={{ marginTop: 6, gap: 8 }}>
                          {res.refs.lot && <a href={`/lots/${res.refs.lot}`} onClick={(e) => { e.preventDefault(); navigate(`/lots/${res.refs!.lot}`); }} style={{ color: "var(--suma-cyan-300)" }}>Lot {res.refs.lot}</a>}
                          {res.refs.programme && <a href={`/programmes/${res.refs.programme}`} onClick={(e) => { e.preventDefault(); navigate(`/programmes/${res.refs!.programme}`); }} style={{ color: "var(--suma-cyan-300)" }}>Programme</a>}
                          {res.refs.credential && <a href={`/verify/${res.refs.credential}`} onClick={(e) => { e.preventDefault(); navigate(`/verify/${res.refs!.credential}`); }} style={{ color: "var(--suma-cyan-300)" }}>Certificate {res.refs.credential}</a>}
                          {res.refs.tx && <a href={`/network/explorer/tx/${res.refs.tx}`} onClick={(e) => { e.preventDefault(); navigate(`/network/explorer/tx/${res.refs!.tx}`); }} style={{ color: "var(--suma-cyan-300)" }}>Transaction</a>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="stack" style={{ gap: 6 }}>
          <div className="eyebrow" style={{ color: "var(--suma-cyan-300)" }}>
            What to point out
          </div>
          <ul className="p-points">
            {scene.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="p-foot">
        <Button variant="inverse" size="sm" disabled={!prev || !!busy} onClick={() => prev && jump(prev)}>
          Previous scene
        </Button>
        <div style={{ flex: 1 }} />
        <Button size="sm" disabled={!next || !!busy} onClick={() => next && jump(next)} loading={!!next && busy === `reset:${next.id}`}>
          Next scene
        </Button>
      </div>
    </aside>
  );
}
