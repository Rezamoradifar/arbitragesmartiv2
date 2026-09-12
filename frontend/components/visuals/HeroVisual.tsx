import { Defs, Link, Node, ParticleField, PerspectiveGrid, GOLD, VOLT } from "./primitives";

/**
 * The hero: a financial network suspended over a receding grid.
 *
 * Composed in layers back-to-front — grid, orbits, mesh, core, particles —
 * because depth in a flat vector has to be built from occlusion and haze
 * rather than from an actual camera. Carries no text: the headline sits in
 * real DOM above it, so it stays selectable, translatable and legible at any
 * viewport instead of being baked into pixels.
 */

const ID = "hero";

// Fixed layout rather than generated: a hand-placed mesh reads as designed,
// while a random one reads as noise at this size.
const NODES: Array<{ x: number; y: number; r: number; tone: "gold" | "volt"; halo?: boolean }> = [
  { x: 320, y: 196, r: 11, tone: "gold", halo: true }, // core
  { x: 196, y: 138, r: 5, tone: "volt" },
  { x: 452, y: 142, r: 5.5, tone: "volt" },
  { x: 148, y: 232, r: 4.5, tone: "volt" },
  { x: 498, y: 236, r: 5, tone: "gold" },
  { x: 258, y: 92, r: 4, tone: "volt" },
  { x: 392, y: 88, r: 4.5, tone: "gold" },
  { x: 236, y: 286, r: 4.5, tone: "volt" },
  { x: 408, y: 292, r: 4, tone: "volt" },
  { x: 92, y: 168, r: 3.5, tone: "volt" },
  { x: 556, y: 176, r: 3.5, tone: "volt" },
  { x: 320, y: 330, r: 4, tone: "gold" },
];

const EDGES: Array<[number, number, boolean, number]> = [
  [0, 1, true, 0], [0, 2, true, 0.6], [0, 3, false, 0], [0, 4, true, 1.2],
  [0, 5, false, 0], [0, 6, true, 1.8], [0, 7, false, 0], [0, 8, true, 2.4],
  [1, 5, false, 0], [2, 6, false, 0], [1, 3, false, 0], [2, 4, false, 0],
  [3, 7, false, 0], [4, 8, false, 0], [9, 1, true, 0.9], [10, 2, true, 1.5],
  [7, 11, false, 0], [8, 11, false, 0],
];

export function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 400"
      /* text-graphite-950 is what the canvas and the edge fades resolve their
         currentColor against, so the illustration follows the theme without
         putting a var() inside an SVG attribute — WebKit is unreliable there. */
      className={`h-full w-full text-graphite-950 ${className}`}
      role="img"
      aria-label="Abstract visualisation of a decentralised financial network: interconnected nodes over a receding grid, with data flowing along the links."
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs id={ID} />

      {/* Backdrop wash — the light source everything else is lit by. */}
      <rect width="640" height="400" fill="currentColor" />
      <ellipse cx="320" cy="200" rx="300" ry="190" fill={`url(#${ID}-halo-volt)`} opacity=".5" />
      <ellipse cx="320" cy="200" rx="150" ry="110" fill={`url(#${ID}-halo)`} opacity=".55" />

      <PerspectiveGrid id={ID} />

      {/* Orbital rings. Skewed rather than circular so the plane reads as
          tilted away from the viewer. */}
      <g opacity=".5">
        <ellipse cx="320" cy="196" rx="215" ry="72" fill="none" stroke={VOLT.mid} strokeWidth=".8" opacity=".3" />
        <ellipse cx="320" cy="196" rx="160" ry="52" fill="none" stroke={GOLD.mid} strokeWidth=".7" opacity=".26" />
        <ellipse cx="320" cy="196" rx="266" ry="94" fill="none" stroke={VOLT.deep} strokeWidth=".6" opacity=".22" />
      </g>

      {/* Market trace: one real signal in an otherwise abstract field, so the
          image says "finance" without a single coin or ticker. */}
      <g opacity=".55">
        <path
          d="M60 316 L108 300 L142 308 L186 274 L228 288 L268 246 L312 258 L354 214 L398 226 L442 186 L486 198 L528 158 L578 168"
          fill="none"
          stroke={`url(#${ID}-gold)`}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${ID}-glow)`}
        />
        <path
          d="M60 316 L108 300 L142 308 L186 274 L228 288 L268 246 L312 258 L354 214 L398 226 L442 186 L486 198 L528 158 L578 168 L578 400 L60 400 Z"
          fill={`url(#${ID}-gold)`}
          opacity=".07"
        />
      </g>

      {/* Mesh behind the nodes so links pass under them, not over. */}
      <g>
        {EDGES.map(([a, b, flow, delay], i) => {
          const p = NODES[a];
          const q = NODES[b];
          // Bowed rather than straight: a slight arc keeps parallel runs from
          // stacking into moiré and suggests a curved surface.
          const mx = (p.x + q.x) / 2;
          const my = (p.y + q.y) / 2 - Math.abs(p.x - q.x) * 0.09;
          const d = `M${p.x} ${p.y} Q${mx} ${my} ${q.x} ${q.y}`;
          return (
            <Link
              key={i}
              d={d}
              id={ID}
              tone={i % 5 === 0 ? "gold" : "volt"}
              flow={flow}
              delay={delay}
              opacity={0.26}
            />
          );
        })}
      </g>

      {NODES.map((n, i) => (
        <Node key={i} cx={n.x} cy={n.y} r={n.r} tone={n.tone} id={ID} halo={n.halo} />
      ))}

      {/* Core detail — a rotating ring reads as a live system rather than a
          still. One slow rotation, nothing else. */}
      <g style={{ transformOrigin: "320px 196px" }} className="animate-spin-slow">
        <circle
          cx="320"
          cy="196"
          r="34"
          fill="none"
          stroke={GOLD.mid}
          strokeWidth=".9"
          strokeDasharray="2 9"
          opacity=".7"
        />
        <circle cx="320" cy="196" r="48" fill="none" stroke={VOLT.mid} strokeWidth=".6" strokeDasharray="1 14" opacity=".5" />
      </g>

      <ParticleField id={ID} count={44} seed={7} />

      {/* Haze over the lower third: atmospheric perspective, so the far edge
          of the grid recedes instead of ending. */}
      <rect x="0" y="300" width="640" height="100" fill="url(#hero-fade)" />
      <defs>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="100%" stopColor="currentColor" stopOpacity=".9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
