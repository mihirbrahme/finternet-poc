import { Fragment, useState, type ReactNode } from "react";
import { post, useApi } from "../lib/api";
import { Link } from "../lib/router";
import { Alert, Badge, Button, Card } from "./ui";

export interface Draft {
  kind: "commitment" | "exclusion";
  title: string;
  summary: string;
  prefill: Record<string, any>;
}

interface Answer {
  mode: "live" | "scripted";
  model?: string;
  answer: string;
  calls: { name: string; input: Record<string, unknown>; ok: boolean; error?: string; ms: number }[];
  cites: string[];
  drafts: Draft[];
  notice?: string;
}

const citeLink = (id: string) =>
  id.startsWith("PRG-") ? `/programmes/${id}` : id.startsWith("VRL-") ? `/lots/${id}` : /^(PC|FRC|VR|EPR|WR)-/.test(id) ? `/verify/${id}` : null;

/** Minimal, safe rendering of the assistant's text: paragraphs, "- " lists, numbered lists and **bold**. Never HTML. */
function Rich({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const inner = part.slice(2, -2);
        const to = citeLink(inner);
        return <strong key={i}>{to ? <Link to={to} className="mono">{inner}</Link> : inner}</strong>;
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
  return (
    <div className="assistant-text">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•]\s/, ""))}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+\.\s/.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+\.\s/, ""))}</li>)}</ol>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}

export function AssistantPanel({ role, actingAs, suggestions, onDraft, intro }: { role: "sponsor" | "verifier"; actingAs: string; suggestions: string[]; onDraft: (d: Draft) => void; intro: string }) {
  const { data: status } = useApi<any>("/api/assistant/status");
  const [prompt, setPrompt] = useState(suggestions[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [thread, setThread] = useState<{ prompt: string; answer: Answer }[]>([]);

  const ask = async (q = prompt) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const answer = await post<Answer>(`/api/assistant/${role}`, { as: actingAs, prompt: q });
      setThread((t) => [{ prompt: q, answer }, ...t]);
      setPrompt("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={role === "sponsor" ? "Sponsor assistant" : "Verifier assistant"}
      sub={intro}
      actions={
        status &&
        (status.mode === "live" ? (
          <Badge tone="success" dot title={`${status.provider} · ${status.model}`}>Live · {status.model}</Badge>
        ) : (
          <Badge tone="sim" title={status.howToEnable}>Scripted mode</Badge>
        ))
      }
    >
      <div className="stack">
        <textarea className="textarea" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => (e.key === "Enter" && (e.metaKey || e.ctrlKey) ? ask() : undefined)} placeholder="Ask in plain language" aria-label="Question for the assistant" />
        <div className="row between">
          <div className="row" style={{ gap: 6 }}>
            {suggestions.map((s) => (
              <button key={s} type="button" className="tag" style={{ cursor: "pointer", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s} onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </div>
          <Button onClick={() => ask()} loading={busy} disabled={!prompt.trim()}>Ask</Button>
        </div>
        {busy && <span className="small muted">Querying the registry and the open network through the assistant gateway…</span>}
        {error && <Alert tone="danger" title="The assistant could not answer">{error}</Alert>}
        {status?.mode === "scripted" && thread.length === 0 && (
          <p className="small muted">No model key is configured, so answers come from a deterministic script that uses the same gateway tools and registry data. {status.howToEnable}</p>
        )}
        {thread.map(({ prompt: q, answer: a }, i) => (
          <div key={thread.length - i} className="assistant-turn">
            <div className="assistant-q">{q}</div>
            {a.notice && <Alert tone="warning" title="Answered in scripted mode">{a.notice}</Alert>}
            <Rich text={a.answer} />
            {a.drafts.map((d) => (
              <div key={d.title} className="assistant-draft">
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div className="row" style={{ gap: 8 }}><Badge tone="warning">Draft, not submitted</Badge><span className="strong">{d.title}</span></div>
                  <p className="small" style={{ marginTop: 6 }}>{d.summary}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onDraft(d)}>{d.kind === "commitment" ? "Review in Discover" : "Load into decision form"}</Button>
              </div>
            ))}
            <details className="assistant-trace">
              <summary className="small muted">
                {a.mode === "live" ? `Live · ${a.model}` : "Scripted"} · {a.calls.length} gateway call{a.calls.length === 1 ? "" : "s"}
                {a.cites.length ? ` · cites ${a.cites.length} record${a.cites.length === 1 ? "" : "s"}` : ""}
              </summary>
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                {a.calls.map((c, j) => (
                  <div key={j} className="small mono">
                    <span className={c.ok ? "" : "danger-text"}>{c.ok ? "✓" : "×"} {c.name}</span> <span className="muted">{JSON.stringify(c.input)}</span>
                    {c.error && <span className="danger-text"> refused: {c.error}</span>}
                  </div>
                ))}
                {a.cites.length > 0 && (
                  <div className="row" style={{ gap: 6 }}>
                    {a.cites.slice(0, 24).map((id) => {
                      const to = citeLink(id);
                      return to ? <Link key={id} to={to} className="tag mono">{id}</Link> : <span key={id} className="tag mono">{id}</span>;
                    })}
                  </div>
                )}
              </div>
            </details>
          </div>
        ))}
        <p className="small muted" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
          Assistants hold no keys. They read the registry and the network through a gateway with fixed rules, treat catalogue and evidence text as unverified, and only prepare drafts. Every call is logged.
        </p>
      </div>
    </Card>
  );
}
