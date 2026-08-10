/**
 * Shared building blocks for the section visuals.
 *
 * Everything here is inline SVG rather than raster art. That is a deliberate
 * trade: no image generation was available, and stock imagery would have
 * undercut the brief more than it helped. Vectors also happen to be the right
 * answer for this content — they are a few KB, scale to any DPR without a
 * srcset, inherit the palette so a theme change cannot leave a stale asset
 * behind, and can animate the thing they depict instead of faking it.
 *
 * Ids must be unique per instance: two SVGs sharing a gradient id on one page
 * silently render the second with the first's fill.
 */

import type { ReactNode } from "react";

export const GOLD = { light: "#f4df9c", mid: "#e0ad3c", deep: "#b3741f" };
export const VOLT = { light: "#8ec7ff", mid: "#3384fb", deep: "#164ddc" };

/** Wraps a visual so every one crops, scales and lazy-composites the same way. */
export function VisualFrame({
  children,
  className = "",
  ratio = "aspect-[16/10]",
}: {
  children: ReactNode;
  className?: string;
  ratio?: string;
}) {
  return (
    <div
      className={`relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/[.06] bg-graphite-925 ${ratio} ${className}`}
      /* `content-visibility` lets the browser skip layout and paint for
         off-screen visuals — the vector equivalent of lazy-loading an image.
         The placeholder size is given on the BLOCK axis only: the two-value
         `contain-intrinsic-size` also sets an inline size, and a 640px
         intrinsic width makes a grid item (min-width:auto) refuse to shrink,
         which blew the whole page past the viewport on a phone. The inline
         size comes from the grid track, and the aspect ratio does the rest. */
      style={{ contentVisibility: "auto", containIntrinsicBlockSize: "400px" }}
    >
      {children}
      {/* Vignette: pulls the eye to the centre and hides the hard crop. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,6,11,.85)_100%)]" />
    </div>
  );
}

/** Gold/volt gradient defs plus a soft glow filter, keyed per instance. */
export function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={GOLD.light} />
        <stop offset="52%" stopColor={GOLD.mid} />
        <stop offset="100%" stopColor={GOLD.deep} />
      </linearGradient>
      <linearGradient id={`${id}-volt`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={VOLT.light} />
        <stop offset="50%" stopColor={VOLT.mid} />
        <stop offset="100%" stopColor={VOLT.deep} />
      </linearGradient>
      <radialGradient id={`${id}-halo`}>
        <stop offset="0%" stopColor={GOLD.mid} stopOpacity=".5" />
        <stop offset="100%" stopColor={GOLD.mid} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-halo-volt`}>
        <stop offset="0%" stopColor={VOLT.mid} stopOpacity=".55" />
        <stop offset="100%" stopColor={VOLT.mid} stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id={`${id}-soft`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
  );
}

/** A node on the network: filled core, thin ring, optional halo. */
export function Node({
  cx,
  cy,
  r = 5,
  tone = "gold",
  id,
  halo = false,
}: {
  cx: number;
  cy: number;
  r?: number;
  tone?: "gold" | "volt";
  id: string;
  halo?: boolean;
}) {
  const fill = tone === "gold" ? `url(#${id}-gold)` : `url(#${id}-volt)`;
  const stroke = tone === "gold" ? GOLD.light : VOLT.light;
  return (
    <g>
      {halo && <circle cx={cx} cy={cy} r={r * 6} fill={`url(#${id}-halo${tone === "volt" ? "-volt" : ""})`} />}
      <circle cx={cx} cy={cy} r={r * 2.1} fill={stroke} opacity=".10" />
      <circle cx={cx} cy={cy} r={r} fill={fill} filter={`url(#${id}-glow)`} />
      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={stroke} strokeWidth=".6" opacity=".35" />
    </g>
  );
}

/**
 * A link between nodes. `flow` animates a dash along it, which is what makes
 * the diagram read as infrastructure carrying something rather than as a
 * static graph.
 */
export function Link({
  d,
  tone = "volt",
  id,
  flow = false,
  width = 1,
  opacity = 0.3,
  delay = 0,
}: {
  d: string;
  tone?: "gold" | "volt";
  id: string;
  flow?: boolean;
  width?: number;
  opacity?: number;
  delay?: number;
}) {
  const c = tone === "gold" ? GOLD.mid : VOLT.mid;
  return (
    <g>
      <path d={d} fill="none" stroke={c} strokeWidth={width} opacity={opacity} />
      {flow && (
        <path
          d={d}
          fill="none"
          stroke={tone === "gold" ? GOLD.light : VOLT.light}
          strokeWidth={width + 0.6}
          strokeLinecap="round"
          strokeDasharray="3 40"
          className="animate-dash-flow"
          style={{ animationDelay: `${delay}s` }}
          filter={`url(#${id}-glow)`}
        />
      )}
    </g>
  );
}

/** Perspective floor grid — the cheapest convincing depth cue in a flat medium. */
export function PerspectiveGrid({ id, rows = 9, cols = 15 }: { id: string; rows?: number; cols?: number }) {
  const lines: ReactNode[] = [];
  for (let i = 0; i <= rows; i++) {
    // Quadratic spacing: lines bunch toward the horizon the way real ones do.
    const t = i / rows;
    const y = 200 + t * t * 220;
    lines.push(
      <line key={`h${i}`} x1={-200} y1={y} x2={840} y2={y} stroke="#fff" strokeWidth=".4" opacity={0.03 + t * 0.05} />,
    );
  }
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * 640;
    const spread = (x - 320) * 2.6 + 320;
    lines.push(
      <line key={`v${i}`} x1={x} y1={200} x2={spread} y2={420} stroke="#fff" strokeWidth=".4" opacity=".045" />,
    );
  }
  return <g>{lines}</g>;
}

/** Deterministic pseudo-random so particle fields never differ between
 *  server and client render — a Math.random() field hydrates mismatched. */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** Drifting data motes. Purely atmospheric, kept sparse and dim. */
export function ParticleField({ id, count = 34, seed = 1 }: { id: string; count?: number; seed?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const s = seed * 100 + i;
        const cx = rand(s) * 640;
        const cy = rand(s + 1) * 400;
        const r = 0.5 + rand(s + 2) * 1.3;
        const gold = rand(s + 3) > 0.72;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={gold ? GOLD.light : VOLT.light}
            opacity={0.12 + rand(s + 4) * 0.4}
            filter={`url(#${id}-soft)`}
          />
        );
      })}
    </g>
  );
}
