import { Defs, Link, Node, ParticleField, GOLD, VOLT, rand } from "./primitives";

/**
 * One visual per feature, each built on a different geometric idea so no two
 * read as the same asset recoloured:
 *
 *   security    — concentric shields, a locked core
 *   strategy    — branching decision paths over a market trace
 *   global      — a dot-matrix globe with arcing routes
 *   analytics   — layered chart planes in perspective
 *   ecosystem   — a hub-and-satellite ring
 *   verification— stacked ledger blocks with a check chain
 *
 * All of them share the palette and the node/link primitives, which is what
 * keeps six different compositions looking like one family.
 */

/* ============================================================
   1. SMART CONTRACT SECURITY
   ============================================================ */
export function SecurityVisual() {
  const ID = "vis-sec";
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full text-graphite-950" role="img"
      aria-label="Layered shield architecture protecting an encrypted core.">
      <Defs id={ID} />
      <rect width="640" height="400" fill="currentColor" />
      <ellipse cx="320" cy="200" rx="230" ry="160" fill={`url(#${ID}-halo)`} opacity=".4" />

      {/* Nested shields — each ring is one more layer between outside and core. */}
      {[168, 132, 96].map((s, i) => (
        <path
          key={i}
          d={`M320 ${200 - s} L${320 + s * 0.72} ${200 - s * 0.5} L${320 + s * 0.72} ${200 + s * 0.22}
              Q${320 + s * 0.72} ${200 + s * 0.78} 320 ${200 + s}
              Q${320 - s * 0.72} ${200 + s * 0.78} ${320 - s * 0.72} ${200 + s * 0.22}
              L${320 - s * 0.72} ${200 - s * 0.5} Z`}
          fill="none"
          stroke={i === 2 ? `url(#${ID}-gold)` : VOLT.mid}
          strokeWidth={i === 2 ? 1.8 : 1}
          opacity={0.24 + i * 0.22}
          filter={i === 2 ? `url(#${ID}-glow)` : undefined}
        />
      ))}

      {/* Encrypted core: a padlock reduced to its two essential strokes. */}
      <g filter={`url(#${ID}-glow)`}>
        <rect x="300" y="196" width="40" height="32" rx="6" fill={`url(#${ID}-gold)`} />
        <path d="M308 196 v-10 a12 12 0 0 1 24 0 v10" fill="none" stroke={GOLD.light} strokeWidth="3.4" />
      </g>

      {/* Vertices on the outer shield, wired inward. */}
      {[
        [320, 32], [550, 116], [550, 244], [320, 368], [90, 244], [90, 116],
      ].map(([x, y], i) => (
        <g key={i}>
          <Link d={`M${x} ${y} L320 200`} id={ID} tone="volt" flow={i % 2 === 0} delay={i * 0.4} opacity={0.18} />
          <Node cx={x} cy={y} r={4} tone={i % 3 === 0 ? "gold" : "volt"} id={ID} />
        </g>
      ))}

      {/* Hash fragments — the texture of something encrypted, without
          spelling anything out. */}
      <g opacity=".3" fontFamily="ui-monospace, monospace" fontSize="7" fill={VOLT.light}>
        {Array.from({ length: 10 }, (_, i) => (
          <text key={i} x={40 + rand(i * 3) * 520} y={44 + rand(i * 7) * 320}>
            {Math.floor(rand(i * 11) * 0xfffff).toString(16).padStart(5, "0")}
          </text>
        ))}
      </g>
      <ParticleField id={ID} count={22} seed={3} />
    </svg>
  );
}

/* ============================================================
   2. AUTOMATED STRATEGIES
   ============================================================ */
export function StrategyVisual() {
  const ID = "vis-str";
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full text-graphite-950" role="img"
      aria-label="Branching algorithmic decision paths flowing across a market trace.">
      <Defs id={ID} />
      <rect width="640" height="400" fill="currentColor" />
      <ellipse cx="200" cy="200" rx="240" ry="170" fill={`url(#${ID}-halo-volt)`} opacity=".38" />

      {/* Candles, back layer: market context the algorithm reads. */}
      <g opacity=".26">
        {Array.from({ length: 26 }, (_, i) => {
          const x = 30 + i * 23;
          const h = 24 + rand(i * 5) * 96;
          const y = 300 - h * 0.6;
          const up = rand(i * 13) > 0.45;
          return (
            <g key={i}>
              <line x1={x} y1={y - 10} x2={x} y2={y + h + 10} stroke={up ? GOLD.mid : VOLT.mid} strokeWidth=".7" />
              <rect x={x - 4} y={y} width="8" height={h} rx="1.5" fill={up ? GOLD.mid : VOLT.deep} opacity=".8" />
            </g>
          );
        })}
      </g>

      {/* Decision tree: one input, branching, converging on an execution. */}
      <g>
        <Link d="M60 200 C140 200 140 108 220 108" id={ID} tone="volt" flow width={1.4} opacity={0.3} />
        <Link d="M60 200 C140 200 140 292 220 292" id={ID} tone="volt" flow delay={0.5} width={1.4} opacity={0.3} />
        <Link d="M220 108 C300 108 300 60 380 60" id={ID} tone="volt" opacity={0.22} />
        <Link d="M220 108 C300 108 300 160 380 160" id={ID} tone="gold" flow delay={1} width={1.4} opacity={0.3} />
        <Link d="M220 292 C300 292 300 244 380 244" id={ID} tone="gold" flow delay={1.4} width={1.4} opacity={0.3} />
        <Link d="M220 292 C300 292 300 344 380 344" id={ID} tone="volt" opacity={0.22} />
        <Link d="M380 160 C470 160 470 200 560 200" id={ID} tone="gold" flow delay={1.9} width={1.8} opacity={0.4} />
        <Link d="M380 244 C470 244 470 200 560 200" id={ID} tone="gold" flow delay={2.2} width={1.8} opacity={0.4} />
      </g>

      <Node cx={60} cy={200} r={6} tone="volt" id={ID} />
      {[[220, 108], [220, 292], [380, 60], [380, 160], [380, 244], [380, 344]].map(([x, y], i) => (
        <Node key={i} cx={x} cy={y} r={4} tone={i === 3 || i === 4 ? "gold" : "volt"} id={ID} />
      ))}
      <Node cx={560} cy={200} r={9} tone="gold" id={ID} halo />

      <ParticleField id={ID} count={20} seed={11} />
    </svg>
  );
}

/* ============================================================
   3. GLOBAL INFRASTRUCTURE
   ============================================================ */
export function GlobalVisual() {
  const ID = "vis-glb";
  // Dot-matrix sphere: latitude bands with longitude-proportional spacing, so
  // density falls off toward the poles the way a real projection does.
  const dots: Array<{ x: number; y: number; o: number }> = [];
  for (let lat = -80; lat <= 80; lat += 10) {
    const rad = (lat * Math.PI) / 180;
    const count = Math.max(4, Math.round(Math.cos(rad) * 30));
    for (let i = 0; i < count; i++) {
      const lon = (i / count) * 360 - 180;
      const lr = (lon * Math.PI) / 180;
      const x = 320 + Math.cos(rad) * Math.sin(lr) * 150;
      const y = 200 - Math.sin(rad) * 150;
      // Fade the far hemisphere instead of hiding it — reads as a globe, not a disc.
      const depth = Math.cos(rad) * Math.cos(lr);
      dots.push({ x, y, o: depth > 0 ? 0.16 + depth * 0.5 : 0.07 });
    }
  }
  const hubs: Array<[number, number]> = [
    [268, 148], [372, 162], [316, 116], [252, 244], [392, 240], [320, 200],
  ];
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full text-graphite-950" role="img"
      aria-label="A dot-matrix globe with financial routes arcing between network hubs.">
      <Defs id={ID} />
      <rect width="640" height="400" fill="currentColor" />
      <circle cx="320" cy="200" r="190" fill={`url(#${ID}-halo-volt)`} opacity=".4" />

      <g>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="1.5" fill={VOLT.light} opacity={d.o} />
        ))}
      </g>
      <circle cx="320" cy="200" r="150" fill="none" stroke={VOLT.mid} strokeWidth=".7" opacity=".24" />

      {/* Great-circle style arcs between hubs. */}
      {hubs.slice(0, 5).map(([x, y], i) => {
        const [tx, ty] = hubs[(i + 2) % hubs.length];
        const mx = (x + tx) / 2;
        const my = (y + ty) / 2 - 66;
        return (
          <Link key={i} d={`M${x} ${y} Q${mx} ${my} ${tx} ${ty}`}
            id={ID} tone={i % 2 ? "gold" : "volt"} flow delay={i * 0.55} width={1.2} opacity={0.32} />
        );
      })}

      {hubs.map(([x, y], i) => (
        <Node key={i} cx={x} cy={y} r={i === 5 ? 7 : 4.5} tone={i % 3 === 0 ? "gold" : "volt"} id={ID} halo={i === 5} />
      ))}

      <ParticleField id={ID} count={26} seed={5} />
    </svg>
  );
}

/* ============================================================
   4. ANALYTICS
   ============================================================ */
export function AnalyticsVisual() {
  const ID = "vis-ana";
  // Three stacked planes in a shared skew — depth without a 3D engine.
  const plane = (yOff: number, seed: number, tone: "gold" | "volt", op: number) => {
    const pts = Array.from({ length: 13 }, (_, i) => {
      const x = 110 + i * 34;
      const y = 250 + yOff - (30 + rand(seed + i) * 76);
      return `${x} ${y}`;
    });
    const line = `M${pts.join(" L")}`;
    const last = 110 + 12 * 34;
    return (
      <g>
        <path d={`${line} L${last} ${262 + yOff} L110 ${262 + yOff} Z`}
          fill={tone === "gold" ? `url(#${ID}-gold)` : `url(#${ID}-volt)`} opacity={op * 0.22} />
        <path d={line} fill="none"
          stroke={tone === "gold" ? `url(#${ID}-gold)` : `url(#${ID}-volt)`}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          opacity={op} filter={`url(#${ID}-glow)`} />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full text-graphite-950" role="img"
      aria-label="Layered analytics planes showing performance, liquidity and allocation.">
      <Defs id={ID} />
      <rect width="640" height="400" fill="currentColor" />
      <ellipse cx="340" cy="210" rx="250" ry="160" fill={`url(#${ID}-halo)`} opacity=".3" />

      {/* Gridded backplane, skewed to sit under the traces. */}
      <g transform="skewY(-7)" opacity=".5">
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1="100" y1={140 + i * 26} x2="560" y2={140 + i * 26} stroke="#fff" strokeWidth=".4" opacity=".05" />
        ))}
        {Array.from({ length: 13 }, (_, i) => (
          <line key={i} x1={110 + i * 34} y1="140" x2={110 + i * 34} y2="296" stroke="#fff" strokeWidth=".4" opacity=".04" />
        ))}
      </g>

      <g transform="skewY(-7)">
        {plane(46, 31, "volt", 0.4)}
        {plane(16, 17, "volt", 0.62)}
        {plane(-16, 3, "gold", 0.95)}
      </g>

      {/* Bars along the base: volume under the curves. */}
      <g opacity=".4">
        {Array.from({ length: 22 }, (_, i) => {
          const h = 6 + rand(i * 9) * 40;
          return <rect key={i} x={112 + i * 20} y={330 - h} width="9" height={h} rx="2"
            fill={i % 4 === 0 ? GOLD.mid : VOLT.mid} opacity=".65" />;
        })}
      </g>

      {/* Reading marker on the leading series. */}
      <g transform="skewY(-7)">
        <line x1="518" y1="140" x2="518" y2="296" stroke={GOLD.light} strokeWidth=".8" strokeDasharray="3 4" opacity=".6" />
        <Node cx={518} cy={196} r={5} tone="gold" id={ID} halo />
      </g>
      <ParticleField id={ID} count={16} seed={23} />
    </svg>
  );
}

/* ============================================================
   5. WEB3 ECOSYSTEM
   ============================================================ */
export function EcosystemVisual() {
  const ID = "vis-eco";
  const R = 132;
  const sats = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return { x: 320 + Math.cos(a) * R, y: 200 + Math.sin(a) * R * 0.82, i };
  });
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full text-graphite-950" role="img"
      aria-label="A protocol hub surrounded by connected wallets, liquidity venues and chains.">
      <Defs id={ID} />
      <rect width="640" height="400" fill="currentColor" />
      <ellipse cx="320" cy="200" rx="220" ry="160" fill={`url(#${ID}-halo)`} opacity=".34" />

      <ellipse cx="320" cy="200" rx={R} ry={R * 0.82} fill="none" stroke={VOLT.mid} strokeWidth=".8" opacity=".26" />
      <ellipse cx="320" cy="200" rx={R * 1.42} ry={R * 1.16} fill="none" stroke={GOLD.mid} strokeWidth=".6" opacity=".16" />

      {/* Spokes to the hub, plus a rim linking neighbours — a ring, not a star. */}
      {sats.map((s, i) => (
        <Link key={`s${i}`} d={`M320 200 L${s.x} ${s.y}`} id={ID}
          tone={i % 3 === 0 ? "gold" : "volt"} flow={i % 2 === 0} delay={i * 0.32} opacity={0.24} />
      ))}
      {sats.map((s, i) => {
        const n = sats[(i + 1) % sats.length];
        return <Link key={`r${i}`} d={`M${s.x} ${s.y} L${n.x} ${n.y}`} id={ID} tone="volt" opacity={0.14} />;
      })}

      {/* Satellites: alternating glyphs so they read as different kinds of
          participant rather than eight copies of one node. */}
      {sats.map((s, i) => (
        <g key={i}>
          <Node cx={s.x} cy={s.y} r={5} tone={i % 3 === 0 ? "gold" : "volt"} id={ID} />
          {i % 3 === 0 ? (
            <rect x={s.x - 9} y={s.y - 7} width="18" height="14" rx="3" fill="none"
              stroke={GOLD.light} strokeWidth=".9" opacity=".55" />
          ) : (
            <circle cx={s.x} cy={s.y} r="11" fill="none" stroke={VOLT.light} strokeWidth=".8"
              strokeDasharray="2 3" opacity=".45" />
          )}
        </g>
      ))}

      {/* Hub: hexagon, the one shape not used anywhere else in the set. */}
      <g filter={`url(#${ID}-glow)`}>
        <path d="M320 168 L348 184 L348 216 L320 232 L292 216 L292 184 Z"
          fill={`url(#${ID}-gold)`} opacity=".9" />
        <path d="M320 178 L339 189 L339 211 L320 222 L301 211 L301 189 Z" fill="currentColor" opacity=".55" />
      </g>
      <ParticleField id={ID} count={24} seed={13} />
    </svg>
  );
}

/* ============================================================
   6. SECURITY CENTER / VERIFICATION
   ============================================================ */
export function VerificationVisual() {
  const ID = "vis-ver";
  const blocks = [0, 1, 2, 3];
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full text-graphite-950" role="img"
      aria-label="A chain of verified ledger blocks, each linked to the last.">
      <Defs id={ID} />
      <rect width="640" height="400" fill="currentColor" />
      <ellipse cx="320" cy="200" rx="240" ry="150" fill={`url(#${ID}-halo-volt)`} opacity=".32" />

      {blocks.map((b) => {
        const x = 92 + b * 128;
        const y = 168 - b * 10;
        const isLast = b === blocks.length - 1;
        return (
          <g key={b}>
            {/* Link to the previous block, drawn behind. */}
            {b > 0 && (
              <Link d={`M${x - 32} ${y + 34} L${x} ${y + 34}`} id={ID} tone="gold" flow delay={b * 0.5} width={1.6} opacity={0.4} />
            )}
            {/* Face + top face: an isometric slab, so the ledger has thickness. */}
            <path d={`M${x} ${y} L${x + 92} ${y} L${x + 92} ${y + 68} L${x} ${y + 68} Z`}
              fill={isLast ? `url(#${ID}-gold)` : "#131622"} opacity={isLast ? ".16" : ".9"}
              stroke={isLast ? GOLD.mid : VOLT.deep} strokeWidth={isLast ? 1.4 : 0.9} />
            <path d={`M${x} ${y} L${x + 18} ${y - 16} L${x + 110} ${y - 16} L${x + 92} ${y} Z`}
              fill="currentColor" stroke={isLast ? GOLD.deep : VOLT.deep} strokeWidth=".7" opacity=".9" />
            <path d={`M${x + 92} ${y} L${x + 110} ${y - 16} L${x + 110} ${y + 52} L${x + 92} ${y + 68} Z`}
              fill="currentColor" stroke={isLast ? GOLD.deep : VOLT.deep} strokeWidth=".7" opacity=".9" />

            {/* Hash lines inside each block. */}
            <g opacity=".5">
              {[0, 1, 2].map((r) => (
                <line key={r} x1={x + 12} y1={y + 20 + r * 14} x2={x + 12 + (30 + rand(b * 7 + r) * 44)} y2={y + 20 + r * 14}
                  stroke={isLast ? GOLD.light : VOLT.mid} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
              ))}
            </g>

            {/* Verified tick on the sealed blocks. */}
            {!isLast && (
              <g transform={`translate(${x + 66} ${y + 50})`} opacity=".85">
                <circle r="9" fill="none" stroke={VOLT.light} strokeWidth="1.1" opacity=".6" />
                <path d="M-4 0 L-1 3.4 L4.4 -3.6" fill="none" stroke={VOLT.light} strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        );
      })}

      {/* The open block at the end is the one still being written. */}
      <g filter={`url(#${ID}-glow)`}>
        <circle cx="522" cy="172" r="4" fill={GOLD.light} className="animate-pulse" />
      </g>

      <g opacity=".26" fontFamily="ui-monospace, monospace" fontSize="7" fill={VOLT.light}>
        {Array.from({ length: 8 }, (_, i) => (
          <text key={i} x={60 + rand(i * 17) * 500} y={300 + rand(i * 23) * 78}>
            0x{Math.floor(rand(i * 29) * 0xffffff).toString(16).padStart(6, "0")}
          </text>
        ))}
      </g>
      <ParticleField id={ID} count={18} seed={19} />
    </svg>
  );
}
