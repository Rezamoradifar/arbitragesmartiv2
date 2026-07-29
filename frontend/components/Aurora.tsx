/**
 * Ambient background for the hero: three slow-moving colour fields behind a
 * fading grid. Purely decorative and non-interactive, so it is aria-hidden and
 * sits behind everything via a negative z-index.
 *
 * Uses transform-only animation (translate3d/scale) so it stays on the
 * compositor and never triggers layout; `prefers-reduced-motion` freezes it
 * through the global rule in globals.css.
 */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade bg-grid [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)]" />

      <div className="absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 animate-float rounded-full bg-brand-500/25 blur-[110px]" />
      <div className="absolute -top-24 right-[6%] h-[26rem] w-[26rem] animate-drift rounded-full bg-iris-500/20 blur-[120px]" />
      <div className="animate-float animate-delay-500 absolute left-[4%] top-24 h-[22rem] w-[22rem] rounded-full bg-brand-300/12 blur-[130px]" />
    </div>
  );
}

/** A small live dot with an expanding ring — used for the "on Polygon" chip. */
export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-400" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
    </span>
  );
}
