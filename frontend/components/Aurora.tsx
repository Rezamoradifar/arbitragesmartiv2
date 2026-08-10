/**
 * Ambient background field: three slow-moving colour washes behind a fading
 * grid. Purely decorative and non-interactive, so it is aria-hidden and sits
 * behind everything via a negative z-index.
 *
 * Transform-only animation (translate3d/scale) keeps it on the compositor so
 * it never triggers layout; `prefers-reduced-motion` freezes it through the
 * global rule in globals.css.
 */
export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade bg-grid [mask-image:radial-gradient(65%_55%_at_50%_0%,#000,transparent)]" />

      {/* Blue dominates, gold is a single small accent. Two warm fields would
          tip the whole page into sepia. */}
      <div className="absolute -top-44 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 animate-float rounded-full bg-volt-600/20 blur-[130px]" />
      <div className="absolute -top-20 right-[4%] h-[24rem] w-[24rem] animate-drift rounded-full bg-gold-500/12 blur-[130px]" />
      <div className="animate-float animate-delay-500 absolute left-[2%] top-32 h-[22rem] w-[22rem] rounded-full bg-volt-400/10 blur-[140px]" />
    </div>
  );
}

/** A small live dot with an expanding ring — used for status chips. */
export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success-400" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success-400 shadow-[0_0_8px_1px_rgba(52,211,153,.7)]" />
    </span>
  );
}
