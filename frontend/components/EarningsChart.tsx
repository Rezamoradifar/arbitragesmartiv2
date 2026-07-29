"use client";

import { useMemo, useRef, useState } from "react";

/**
 * Cumulative earnings over time.
 *
 * Form: change-over-time with two magnitude series → line + area, one shared
 * y-axis. Never a second axis: both series are USDT, so they belong on the
 * same scale and are directly comparable.
 *
 * Series colours are brand-500 and iris-500, validated against the dark chart
 * surface (#0d1120) for lightness band, chroma, CVD separation, normal-vision
 * separation, and contrast. Do not substitute the lighter -400 steps: they sit
 * above the dark-mode lightness band.
 *
 * Identity is never colour-alone — a legend is always present, and each line
 * is direct-labelled at its end.
 */

export type Point = { t: number; yield: number; referral: number };

const SERIES = [
  { key: "yield" as const, label: "Staking yield", color: "#1aab84" },
  { key: "referral" as const, label: "Referral", color: "#6366f1" },
];

export function EarningsChart({ data, height = 260 }: { data: Point[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 720;
  const H = height;
  const PAD = { top: 16, right: 72, bottom: 28, left: 52 };

  const geom = useMemo(() => {
    if (data.length === 0) return null;

    const xs = data.map((d) => d.t);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const maxY = Math.max(
      1,
      ...data.map((d) => Math.max(d.yield, d.referral)),
    );

    const spanX = maxX - minX || 1;
    const px = (t: number) => PAD.left + ((t - minX) / spanX) * (W - PAD.left - PAD.right);
    const py = (v: number) => H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);

    const line = (key: "yield" | "referral") =>
      data.map((d, i) => `${i === 0 ? "M" : "L"}${px(d.t).toFixed(2)},${py(d[key]).toFixed(2)}`).join(" ");

    const area = (key: "yield" | "referral") =>
      `${line(key)} L${px(maxX).toFixed(2)},${H - PAD.bottom} L${px(minX).toFixed(2)},${H - PAD.bottom} Z`;

    // Four gridlines is enough to read a value without becoming a ledger.
    const ticks = Array.from({ length: 4 }, (_, i) => (maxY / 3) * i);

    return { px, py, line, area, minX, maxX, maxY, ticks };
  }, [data, H, W, PAD.left, PAD.right, PAD.top, PAD.bottom]);

  if (!geom || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-white/[.07] text-sm text-ink-400"
        style={{ height }}
      >
        Not enough history yet — your first claim starts this chart.
      </div>
    );
  }

  const active = hover === null ? null : data[hover];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !geom) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    // Nearest point wins, so the hit target is far larger than the mark.
    let best = 0;
    let bestD = Infinity;
    data.forEach((d, i) => {
      const dist = Math.abs(geom.px(d.t) - x);
      if (dist < bestD) {
        bestD = dist;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <figure className="m-0">
      {/* Legend — always present at two series, never colour-alone. */}
      <figcaption className="mb-3 flex flex-wrap items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-xs text-ink-300">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        style={{ height }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Cumulative staking yield and referral earnings over time"
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Recessive grid + y labels in text tokens, never series colour. */}
        {geom.ticks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={geom.py(v)}
              y2={geom.py(v)}
              stroke="rgba(255,255,255,.06)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 10}
              y={geom.py(v) + 4}
              textAnchor="end"
              className="fill-ink-400"
              style={{ fontSize: 11 }}
            >
              {formatTick(v)}
            </text>
          </g>
        ))}

        {SERIES.map((s) => (
          <g key={s.key}>
            <path d={geom.area(s.key)} fill={`url(#fill-${s.key})`} />
            <path
              d={geom.line(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* Direct end-labels — identity without reading the legend. */}
        {SERIES.map((s) => {
          const last = data[data.length - 1];
          return (
            <text
              key={s.key}
              x={W - PAD.right + 8}
              y={geom.py(last[s.key]) + 4}
              className="fill-ink-200"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {formatTick(last[s.key])}
            </text>
          );
        })}

        {/* Crosshair + markers on hover. */}
        {active && (
          <g>
            <line
              x1={geom.px(active.t)}
              x2={geom.px(active.t)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(255,255,255,.22)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {SERIES.map((s) => (
              <circle
                key={s.key}
                cx={geom.px(active.t)}
                cy={geom.py(active[s.key])}
                r="5"
                fill={s.color}
                stroke="#0d1120"
                strokeWidth="2"
              />
            ))}
          </g>
        )}

        <text
          x={PAD.left}
          y={H - 8}
          className="fill-ink-400"
          style={{ fontSize: 11 }}
        >
          {formatDate(geom.minX)}
        </text>
        <text
          x={W - PAD.right}
          y={H - 8}
          textAnchor="end"
          className="fill-ink-400"
          style={{ fontSize: 11 }}
        >
          {formatDate(geom.maxX)}
        </text>
      </svg>

      {active && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-white/[.07] bg-ink-950/80 px-4 py-2.5 text-sm backdrop-blur">
          <span className="text-ink-400">{formatDate(active.t, true)}</span>
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-ink-300">{s.label}</span>
              <span className="font-semibold tabular-nums text-white">
                {active[s.key].toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}

function formatTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString("en-US", { maximumFractionDigits: v < 10 ? 2 : 0 });
}

function formatDate(t: number, withTime = false): string {
  const d = new Date(t * 1000);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
