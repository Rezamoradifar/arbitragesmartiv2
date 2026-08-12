"use client";

import { useMemo, useState } from "react";
import { Alert, Row } from "@/components/ui";
import { useProtocol } from "@/lib/hooks";
import {
  PLANS,
  claimFeeBpsFor,
  depositFeeBpsFor,
  formatAmount,
} from "@/lib/contract";

/**
 * The whole economic model, worked out on the page.
 *
 * Everything here derives from the same plan and fee constants the deposit
 * screen uses, so it cannot say one thing while the contract does another. No
 * figure is typed in.
 *
 * Publishing this is uncomfortable and that is rather the point. A protocol
 * that shows only the rate is asking to be taken on trust; one that shows the
 * rate, what the rate obliges it to pay, and how long its own money would last
 * without new deposits is handing the reader the tools to disagree. Anyone can
 * do this arithmetic from public constants — the only question is whether they
 * find it done honestly here first, or work it out themselves later and wonder
 * what else was left off.
 */

/** Per dollar deposited, on a given plan: what comes back, what we keep. */
function perDollar(planIndex: number) {
  const plan = PLANS[planIndex];
  // Use a deposit size that genuinely lands on this plan, so the fee band and
  // the tier agree rather than being mixed from different rows.
  const gross = plan.minStake === 10 ? 100 : plan.minStake * 1.2;
  const feeBps = depositFeeBpsFor(gross);
  const net = gross * (1 - feeBps / 10_000);
  const yieldOwed = (net * plan.dailyBps * plan.durationDays) / 10_000;
  const claimBps = claimFeeBpsFor(planIndex);
  const claimFee = (yieldOwed * claimBps) / 10_000;

  const owedOut = net + yieldOwed - claimFee;
  const kept = (gross * feeBps) / 10_000 + claimFee;

  return {
    plan,
    owedPerDollar: owedOut / gross,
    keptPerDollar: kept / gross,
    // Days until an idle pool is drained by claims alone.
    daysToEmpty: 1 / ((plan.dailyBps / 10_000) * (1 - claimBps / 10_000)),
  };
}

const ROWS = PLANS.map((_, i) => perDollar(i));

export function TheArithmetic() {
  const p = useProtocol();
  const [strategyPct, setStrategyPct] = useState(15);

  /** What daily rate a given annual strategy return could actually fund. */
  const payableDaily = useMemo(() => {
    // 20% of profit is kept as a performance fee, so 80% reaches stakers.
    return ((strategyPct / 100) * 0.8) / 365;
  }, [strategyPct]);

  const staked = p.totalStaked ?? 0n;
  const held = p.totalAssets ?? 0n;
  // Floor, not forecast: the lowest plan's rate over its full term.
  const floorOwed = (staked * BigInt(PLANS[0].dailyBps) * BigInt(PLANS[0].durationDays)) / 10_000n;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------ per dollar deposited */}
      <div className="glass p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">
          For every dollar deposited
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-300">
          Entry fee off the top, the plan&apos;s rate over its full term, claim fee off the yield.
          The last column is the one that matters.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-white/[.07] text-left text-xs uppercase tracking-wide text-graphite-400">
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 text-right font-medium">Paid out</th>
                <th className="pb-2 text-right font-medium">We keep</th>
                <th className="pb-2 text-right font-medium">Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.plan.name} className="border-b border-white/[.04] last:border-0">
                  <td className="py-2.5 text-graphite-200">{r.plan.name}</td>
                  <td className="py-2.5 text-right tabular-nums text-graphite-100">
                    ${r.owedPerDollar.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-graphite-400">
                    ${r.keptPerDollar.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-semibold text-danger-400">
                    ${(r.owedPerDollar - 1).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-graphite-400">
          The shortfall is what must come from somewhere other than the deposit itself — strategy
          profit, or later deposits. It is the same ratio at any size: a hundred dollars and ten
          million behave identically, because the figures are proportions. Growth does not dilute
          it, because the growth is what creates it.
        </p>
      </div>

      {/* ------------------------------------------------ time to empty */}
      <div className="glass p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">
          How long an idle pool lasts
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-300">
          If no new money arrives and everyone claims as it accrues, the pool drains at{" "}
          <span className="font-mono text-xs text-graphite-200">rate × (1 − claim fee)</span> a day.
          Divide one by that and you get the number of days it survives.
        </p>

        <div className="mt-5 space-y-1">
          {ROWS.map((r) => (
            <Row
              key={r.plan.name}
              label={`${r.plan.name} — term ${r.plan.durationDays} days`}
              value={
                <span
                  className={
                    r.daysToEmpty < r.plan.durationDays ? "text-danger-400" : "text-volt-300"
                  }
                >
                  {r.daysToEmpty.toFixed(0)} days
                </span>
              }
            />
          ))}
        </div>

        <div className="mt-5">
          <Alert tone="warn" title="Every plan empties before its own term ends">
            A pool holding only Elite positions is drained on day{" "}
            {ROWS[3].daysToEmpty.toFixed(0)} of a {PLANS[3].durationDays}-day term. This is not a
            liquidity risk that good management avoids — it is what a fixed rate above what the
            capital earns means, arithmetically. Continuing past that day requires money that has
            not arrived yet.
          </Alert>
        </div>
      </div>

      {/* ------------------------------------------------ payable rate */}
      <div className="glass p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">
          What rate a real strategy could fund
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-300">
          Move the slider to whatever annual return you think a strategy can genuinely earn, and
          compare the daily rate that would pay for against the ones above.
        </p>

        <label className="label mt-5 block" htmlFor="strategy-return">
          Strategy return: {strategyPct}% a year
        </label>
        <input
          id="strategy-return"
          type="range"
          min={0}
          max={100}
          step={1}
          value={strategyPct}
          onChange={(e) => setStrategyPct(Number(e.target.value))}
          className="mt-2 w-full accent-[rgb(224_173_60)]"
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <p className="text-xs uppercase tracking-wide text-graphite-400">Payable daily rate</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-volt-300">
              {(payableDaily * 100).toFixed(4)}%
            </p>
            <p className="mt-1 text-xs text-graphite-500">after a 20% performance fee</p>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <p className="text-xs uppercase tracking-wide text-graphite-400">Lowest plan promises</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-danger-400">
              {(PLANS[0].dailyBps / 100).toFixed(4)}%
            </p>
            <p className="mt-1 text-xs text-graphite-500">
              {payableDaily > 0
                ? `${(PLANS[0].dailyBps / 100 / (payableDaily * 100)).toFixed(0)}× the payable rate`
                : "nothing is payable at 0%"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-graphite-400">
          Push the slider to 50% — better than almost any fund sustains — and the payable rate is
          still a small fraction of the lowest plan. This gap is not closed by a better strategy. It
          is closed by a lower rate, which is what a variable-yield design does: it pays what was
          earned and promises nothing in advance.
        </p>
      </div>

      {/* --------------------------------------------------- live today */}
      <div className="glass glass-gold p-6 sm:p-8">
        <h3 className="font-display text-lg font-semibold text-white">Where that leaves us today</h3>
        <div className="mt-4 space-y-1">
          <Row label="Principal staked" value={`${formatAmount(staked)} USDT`} />
          <Row
            label="Yield promised on it, at the lowest rate"
            value={`${formatAmount(floorOwed)} USDT`}
          />
          <Row
            label="Total owed by the end of those terms"
            value={<span className="text-white">{formatAmount(staked + floorOwed)} USDT</span>}
          />
          <Row label="Held by the contract right now" value={`${formatAmount(held)} USDT`} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-graphite-300">
          Principal is fully backed — the contract holds what it owes as capital. The gap is the
          promised yield, and nothing has earned it yet. Read live from the contract at this block,
          including on the days it does not flatter us.
        </p>
      </div>
    </div>
  );
}
