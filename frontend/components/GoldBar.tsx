/**
 * Bullion, drawn rather than photographed.
 *
 * Stock imagery of gold is both a cliché and a small lie — it shows metal
 * nobody in this programme has been sent yet. A drawn ingot reads as "a bar"
 * without pretending to be a photograph of one, and it stays crisp at any
 * size. The stack height tracks the tier, so the cards read at a glance
 * before anyone gets to the numbers.
 *
 * Shared between the rewards page and the homepage banner that points to it,
 * so the two never draw the metal two slightly different ways.
 */
export function GoldBar({ grams, lead = false }: { grams: number; lead?: boolean }) {
  /** One, two or three bars. Enough to signal scale; more just reads as noise. */
  const count = grams >= 250 ? 3 : grams >= 25 ? 2 : 1;

  /**
   * The drawing also grows with the tier. Stack height alone is too coarse a
   * signal — a gram and a kilo should not be the same object twice.
   */
  const scale = grams >= 1000 ? 1 : grams >= 250 ? 0.9 : grams >= 25 ? 0.78 : 0.6;

  /** Gradients are document-scoped, so every instance needs its own ids. */
  const id = `bar-${grams}`;

  /** The top face of the bar; the front face hangs off its long edge. */
  const TOP = "M30 46 L78 46 L94 60 L14 60 Z";
  const FRONT = "M14 60 L94 60 L88 78 L20 78 Z";

  /** Bottom bar first: later paths paint over earlier ones, which is exactly
   *  the occlusion a stack needs. */
  const layers = Array.from({ length: count }, (_, i) => ({
    dy: -18 * i,
    dx: i % 2 === 0 ? 0 : 3,
    top: i === count - 1,
  }));

  return (
    <svg
      viewBox="0 0 108 96"
      width={108}
      height={96}
      /* Both axes are stated. `w-auto` asks the browser to derive the width
         from the viewBox, which WebKit does not do for an inline SVG — the
         element collapses to zero and the bar vanishes on iPhones while
         looking fine everywhere else. 6.75rem is 108/96 of h-24, so the
         proportions survive a changed root font size. */
      className="h-24 w-[6.75rem]"
      role="img"
      aria-label={`${grams >= 1000 ? grams / 1000 + " kilogram" : grams + " gram"} gold bar`}
    >
      <defs>
        {/* Top face: the lit surface, brightest along the near edge. */}
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2=".8" y2="1">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="40%" stopColor="#f2d47e" />
          <stop offset="100%" stopColor="#d49d31" />
        </linearGradient>
        {/* Front face: falls into shadow toward the base. */}
        <linearGradient id={`${id}-front`} x1=".1" y1="0" x2=".35" y2="1">
          <stop offset="0%" stopColor="#dfab3f" />
          <stop offset="35%" stopColor="#bd8420" />
          <stop offset="80%" stopColor="#8a5417" />
          <stop offset="100%" stopColor="#653c11" />
        </linearGradient>
        {/* One narrow specular sweep. Restrained on purpose: a wide highlight
            reads as plastic rather than metal. */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2=".35">
          <stop offset="30%" stopColor="#fff8e2" stopOpacity="0" />
          <stop offset="46%" stopColor="#fff8e2" stopOpacity=".26" />
          <stop offset="54%" stopColor="#fff8e2" stopOpacity=".26" />
          <stop offset="70%" stopColor="#fff8e2" stopOpacity="0" />
        </linearGradient>
        {/* Contact glow. Radial so it fades rather than ending on a line. */}
        <radialGradient id={`${id}-shadow`} cx=".5" cy=".5" r=".5">
          <stop offset="0%" stopColor="#e0ad3c" stopOpacity=".34" />
          <stop offset="100%" stopColor="#e0ad3c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="54" cy="82" rx={46 * scale} ry={8 * scale} fill={`url(#${id}-shadow)`} />

      <g transform={`translate(54 80) scale(${scale}) translate(-54 -80)`}>
        {layers.map(({ dy, dx, top }) => (
          <g key={dy} transform={`translate(${dx} ${dy})`}>
            <path d={TOP} fill={`url(#${id}-top)`} />
            <path d={FRONT} fill={`url(#${id}-front)`} />
            {/* Bevel: a hairline of light along the edge where the faces meet,
                and a darker one at the base to stop it dissolving into the card. */}
            <path d="M14 60 L94 60" stroke="#fff3cc" strokeOpacity=".7" strokeWidth="1" />
            <path d="M20 78 L88 78" stroke="#3d2309" strokeOpacity=".45" strokeWidth="1" />
            {/* The sheen is confined to the front face by reusing its outline. */}
            <path d={FRONT} fill={`url(#${id}-sheen)`} />
            {top && (
              <>
                {/* Stamp. Suggested, not legible — a fake serial number would be
                    worse than none, and the real one is on the bar we send. */}
                <g stroke="#4a2b0c" strokeOpacity=".3" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M26 67 h13" />
                  <path d="M69 67 h13" />
                </g>
                <text
                  x="54"
                  y="70"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  letterSpacing=".4"
                  fill="#4a2b0c"
                  fillOpacity=".5"
                >
                  999.9
                </text>
              </>
            )}
          </g>
        ))}
      </g>

      {lead && (
        /* One sparkle, clear of the metal, only on the headline tier. */
        <path
          d="M99 12 l1.9 5 5 1.9 -5 1.9 -1.9 5 -1.9 -5 -5 -1.9 5 -1.9 Z"
          fill="#f4df9c"
          opacity=".85"
        />
      )}
    </svg>
  );
}
