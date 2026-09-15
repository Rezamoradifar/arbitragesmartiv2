"use client";

import { useProtocol } from "@/lib/hooks";
import { Alert, Badge, Row, Skeleton } from "@/components/ui";
import { formatAmount, PLANS } from "@/lib/contract";

/**
 * The state of the strategy, stated in figures rather than adjectives.
 *
 * Everything here is read from the contract at the current block. The point of
 * the page it sits on is that the arbitrage engine has not run, and a page
 * making that admission has to prove it the same way it would prove a success
 * — otherwise it is just a different kind of claim.
 */

/** Simple, not compounded, at the lowest plan's rate over its full term. */
function floorObligation(staked: bigint): { yieldOwed: bigint; total: bigint } {
  const p = PLANS[0];
  const yieldOwed = (staked * BigInt(p.dailyBps) * BigInt(p.durationDays)) / 10_000n;
  return { yieldOwed, total: staked + yieldOwed };
}

export function StrategyTruth() {
  const p = useProtocol();

  if (p.isLoading) return <Skeleton className="h-64 w-full" />;

  const deployed = p.arbitrageDeployed ?? 0n;
  const profit = p.arbitrageProfit ?? 0n;
  const staked = p.totalStaked ?? 0n;
  const held = p.totalAssets ?? 0n;
  const neverRun = deployed === 0n && profit === 0n;

  const { yieldOwed, total } = floorObligation(staked);
  const gap = total > held ? total - held : 0n;

  return (
    <div className="space-y-6">
      <div className="glass p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-white">
            What the engine has done so far
          </h2>
          {neverRun ? <Badge tone="warn">Never run</Badge> : <Badge tone="good">Active</Badge>}
        </div>

        <div className="mt-5 space-y-1">
          <Row label="Capital ever deployed to the strategy" value={`${formatAmount(deployed)} USDT`} />
          <Row label="Profit ever realised by the strategy" value={`${formatAmount(profit)} USDT`} />
          <Row label="Open positions" value={deployed === 0n ? "None" : "See the dashboard"} />
        </div>

        {neverRun && (
          <p className="mt-4 text-sm leading-relaxed text-graphite-300">
            Both figures are zero, and they are read from the contract rather than typed here. The
            arbitrage strategy has not been run. Nothing about the yield you have been paid or are
            owed came from it.
          </p>
        )}
      </div>

      <div className="glass p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-white">
          So where does the yield come from?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite-300">
          Today, from the money in the contract — which is deposits. That is the whole answer, and
          it is the answer for every fixed-rate protocol whose strategy has not started paying.
        </p>

        <div className="mt-5 space-y-1">
          <Row label="Principal owed to stakers" value={`${formatAmount(staked)} USDT`} />
          <Row
            label={`Yield promised on it, at the lowest rate over a full term`}
            value={`${formatAmount(yieldOwed)} USDT`}
          />
          <Row
            label="Total owed by the end of those terms"
            value={<span className="text-white">{formatAmount(total)} USDT</span>}
          />
          <Row label="Held by the contract right now" value={`${formatAmount(held)} USDT`} />
          <Row
            label="Shortfall to be earned or deposited"
            value={
              <span className={gap > 0n ? "text-danger-400" : "text-volt-300"}>
                {formatAmount(gap)} USDT
              </span>
            }
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-graphite-400">
          The yield figure is a floor, not a forecast: it applies the Starter rate of{" "}
          {(PLANS[0].dailyBps / 100).toFixed(2)}% a day over {PLANS[0].durationDays} days to every
          staked dollar. Positions on the higher plans are owed more than this, so the real
          obligation is larger. Principal itself is fully backed — the shortfall is the promised
          yield, not your capital.
        </p>
      </div>

      {gap > 0n && (
        <Alert tone="warn" title="Read this before you deposit">
          The rates are settings compiled into a contract, not a return anyone has demonstrated. For
          the promised yield to be paid without relying on later deposits, the strategy has to start
          working and earn it. It has not started. Decide on that basis rather than on the daily
          percentage.
        </Alert>
      )}
    </div>
  );
}
