"use client";

import { useId, useState } from "react";

/**
 * Accessible FAQ accordion.
 *
 * Built on buttons + aria-expanded rather than <details>, because Safari does
 * not animate the native disclosure and the panel needs to share the same
 * easing as the rest of the page. Only one panel is open at a time — the
 * answers are short, and a wall of open text defeats the point of collapsing
 * them.
 */
export function FaqList({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <div className="divide-y divide-white/[.06] overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.02] backdrop-blur-xl">
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${uid}-q-${i}`;
        const panelId = `${uid}-a-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={btnId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[.03] sm:px-6 sm:py-5"
              >
                <span className="min-w-0 font-display text-[15px] font-semibold leading-snug text-white">
                  {item.q}
                </span>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                    isOpen
                      ? "rotate-45 border-gold-400/40 bg-gold-500/10 text-gold-300"
                      : "border-white/10 bg-white/[.04] text-graphite-300"
                  }`}
                  aria-hidden
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
            </h3>
            {/* Grid-rows trick: animates from 0 to content height without
                measuring the panel or hard-coding a max-height. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={`grid transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-graphite-300 sm:px-6 sm:pb-6">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
