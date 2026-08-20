"use client";

import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Progress } from "@/components/ui";
import { LiveDot } from "@/components/Aurora";

/**
 * A stated goal, not a current balance — kept in its own panel rather than
 * folded into the live stat grid above so the two are never mistaken for
 * each other. The real number in it is read from the same contract call as
 * everything else on the page; only the target itself is a plain constant.
 */
const GROWTH_TARGET_USD = 15_000_000;

export function GrowthTarget() {
  const p = useProtocol();
  const currentUsd = p.totalAssets !== undefined ? Number(p.totalAssets) / 1_000_000 : 0;
  const pct = (currentUsd / GROWTH_TARGET_USD) * 100;

  return (
    <div className="glass p-6 sm:p-8">
      <div className="flex items-center gap-2.5">
        <LiveDot />
        <p className="eyebrow !border-0 !bg-transparent !p-0">Growth target</p>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite-300">
        A target we&apos;re working toward before the next major update — not today&apos;s balance.
        Today&apos;s figure is real, read live from the same contract call as the stats above.
      </p>

      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-graphite-400">Total value locked today</p>
          <p className="mt-1.5 font-display text-4xl font-bold tabular-nums leading-none text-white sm:text-5xl">
            {formatAmount(p.totalAssets)}
            <span className="ml-2 text-lg font-semibold text-graphite-400">USDT</span>
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-wide text-graphite-400">Goal</p>
          <p className="text-gold-gradient mt-1.5 font-display text-4xl font-bold leading-none sm:text-5xl">
            $15,000,000
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Progress value={currentUsd} max={GROWTH_TARGET_USD} tone="brand" />
        <p className="mt-2 text-xs text-graphite-500">
          {pct < 0.1 ? "Under 0.1% of the way there — early days." : `${pct.toFixed(1)}% of the way there.`}
        </p>
      </div>
    </div>
  );
}
