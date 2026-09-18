"use client";

import { useEffect, useState } from "react";

/**
 * Countdown to a round's close.
 *
 * Rendered client-side and only after mount: a server-rendered "12d 4h" is
 * wrong by the time anyone reads it, and hydrating a different value than the
 * server printed is a mismatch React will complain about. Showing nothing for
 * one frame is the cheaper trade.
 */
export function RoundCountdown({ endsAt }: { endsAt: string }) {
  const target = new Date(endsAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left === null) {
    return <span className="tabular-nums text-graphite-500">—</span>;
  }

  if (left === 0) {
    return <span className="font-semibold text-warn-400">This round has closed</span>;
  }

  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);

  const parts: Array<[number, string]> = [
    [d, "days"],
    [h, "hours"],
    [m, "min"],
    [s, "sec"],
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {parts.map(([value, label]) => (
        <div
          key={label}
          className="min-w-[4.5rem] rounded-xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-center"
        >
          <div className="font-display text-2xl font-bold tabular-nums text-white">
            {String(value).padStart(2, "0")}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[.14em] text-graphite-500">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
