import { useState, type ReactNode } from "react";

/**
 * Charts follow the Suma conventions: one highlight in teal 600, context in grey, values labelled
 * directly, no y-axis on bar charts, hover tooltips on every mark, and a table view nearby.
 */

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
};

/** Single-series columns over time. The highlighted column (default: last) carries the brand colour. */
export function Columns({ data, format, highlight, height = 200, label }: { data: { x: string; y: number; tip?: ReactNode }[]; format: (n: number) => string; highlight?: number; height?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const top = 22;
  const bottom = 26;
  const h = height - top - bottom;
  const max = niceMax(Math.max(...data.map((d) => d.y), 0));
  const band = W / Math.max(data.length, 1);
  const bw = Math.min(24 * 1.6, band * 0.56);
  const hi = highlight ?? data.length - 1;
  const peak = data.reduce((m, d, i) => (d.y > data[m].y ? i : m), 0);
  return (
    <div className="chart" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${height}`}>
        <line x1={0} x2={W} y1={top + h} y2={top + h} stroke="var(--border-default)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const bh = (d.y / max) * h;
          const x = i * band + (band - bw) / 2;
          const y = top + h - bh;
          const r = Math.min(4, bh);
          return (
            <g key={d.x} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * band} y={top} width={band} height={h + bottom} fill="transparent" />
              <path
                d={`M${x},${top + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${top + h} Z`}
                fill={i === hi ? "var(--suma-teal-600)" : hover === i ? "var(--neutral-400)" : "var(--neutral-300)"}
              />
              {(i === hi || i === peak) && (
                <text className="val" x={x + bw / 2} y={y - 6} textAnchor="middle">
                  {format(d.y)}
                </text>
              )}
              <text x={x + bw / 2} y={height - 8} textAnchor="middle">
                {d.x}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: `${((top + h - (data[hover].y / max) * h) / height) * 100}%` }}>
          {data[hover].tip ?? (
            <>
              {data[hover].x}: <b>{format(data[hover].y)}</b>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Ranked horizontal bars; the first (or highlighted) bar carries the brand colour. */
export function RankBars({ data, format, highlight = 0 }: { data: { label: ReactNode; value: number; swatch?: string }[]; format: (n: number) => string; highlight?: number | null }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div className="hbar" key={i} title={`${typeof d.label === "string" ? d.label : ""} ${format(d.value)}`}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {d.swatch && <span style={{ width: 8, height: 8, flex: "none", background: d.swatch, transform: "rotate(45deg)" }} />}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
          </span>
          <div className="hbar-track">
            <div className={`hbar-fill ${i === highlight ? "" : "context"}`} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="mono" style={{ textAlign: "right", color: "var(--text-strong)" }}>
            {format(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Part-to-whole bar with a legend and direct labels (secondary encoding for the muted brand ramp). */
export function SplitBar({ parts, format }: { parts: { label: string; value: number; colour: string }[]; format: (n: number) => string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="split chart" role="img" aria-label={parts.map((p) => `${p.label} ${format(p.value)}`).join(", ")}>
        {parts.map((p, i) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.colour, opacity: hover === null || hover === i ? 1 : 0.55 }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={`${p.label}: ${format(p.value)} (${((p.value / total) * 100).toFixed(1)}%)`} />
        ))}
      </div>
      <div className="legend">
        {parts.map((p) => (
          <span key={p.label}>
            <i style={{ background: p.colour }} />
            {p.label} <span className="mono strong">{format(p.value)}</span> <span className="muted">({((p.value / total) * 100).toFixed(0)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}
