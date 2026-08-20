"use client";

import { useProtocol } from "@/lib/hooks";
import { formatAmount } from "@/lib/contract";
import { Progress } from "@/components/ui";

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
      <p className="eyebrow">Growth target</p>
      <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
        $15,000,000 in Total Value Locked
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-graphite-300">
        Our goal before the next major update — a target we&apos;re working toward, not today&apos;s
        balance. The figure below it is the real one, read from the same contract call as the stats
        above.
      </p>

      <div className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-graphite-300">
            Today:{" "}
            <span className="font-display font-semibold text-white">
              {formatAmount(p.totalAssets)} USDT
            </span>
          </span>
          <span className="text-graphite-400">Goal: $15,000,000</span>
        </div>
        <div className="mt-3">
          <Progress value={currentUsd} max={GROWTH_TARGET_USD} tone="brand" />
        </div>
        <p className="mt-2 text-xs text-graphite-500">
          {pct < 0.1 ? "Under 0.1% of the way there — early days." : `${pct.toFixed(1)}% of the way there.`}
        </p>
      </div>
    </div>
  );
}
